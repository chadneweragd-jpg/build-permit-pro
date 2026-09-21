'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import { SavedRoute, RouteStop, Permit, TurnByTurnInstruction, TripLeg, PurposeTag, JobRadarAlert } from '@/types';
import { CircuitLeg, CircuitResult } from '@/lib/spatial';
import { MileageRepository } from '@/lib/mileage-repo';
import { CRMRepository } from '@/lib/crm-repo';
import { JobRadarOverlay } from './JobRadarOverlay';
import {
  getAvailableVoices,
  speakNatural as speakNaturalUtil,
  testVoice,
  saveSelectedVoice,
  VOICE_STORAGE_KEY,
  VoiceOption
} from '@/lib/voice-utils';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  MapPin,
  FileCheck,
  Radio,
  Gauge,
  Columns
} from 'lucide-react';

export { speakNaturalUtil as speakNatural };

export interface DriveModeProps {
  originCoords?: [number, number]; // [lng, lat]
  destinationCoords?: [number, number]; // [lng, lat]
  routeGeometry?: any; // GeoJSON LineString or Feature
  steps?: TurnByTurnInstruction[];
  route: SavedRoute;
  circuitResult?: CircuitResult | null;
  allPermits?: Permit[];
  onClose: () => void;
  onStopCompleted?: (stopId: string, loggedLeg: TripLeg) => void;
  onAddDivertStop?: (permit: Permit) => void;
}

/**
 * Calculates Haversine distance in meters between two [lng, lat] coordinates
 */
function getDistanceMeters(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371000 * c;
}

export function DriveModeModal({
  originCoords,
  destinationCoords,
  routeGeometry,
  steps,
  route,
  circuitResult,
  allPermits = [],
  onClose,
  onStopCompleted,
  onAddDivertStop
}: DriveModeProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Multi-Leg Navigation State
  const legs = circuitResult?.legs || [];
  const [currentLegIndex, setCurrentLegIndex] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Active Leg
  const activeLeg: CircuitLeg | undefined = legs[currentLegIndex];

  // Resolve true origin [lng, lat] with zero downtown fallback
  const resolvedOriginLngLat = useMemo<[number, number]>(() => {
    if (originCoords && originCoords.length === 2) {
      const lng = originCoords[0] < 0 ? originCoords[0] : originCoords[1];
      const lat = originCoords[0] < 0 ? originCoords[1] : originCoords[0];
      return [lng, lat];
    }
    if (activeLeg?.originCoords) {
      return [activeLeg.originCoords[1], activeLeg.originCoords[0]];
    }
    if (route.origin_coords) {
      return [route.origin_coords[1], route.origin_coords[0]];
    }
    return [-119.3865, 49.9102]; // 1665 Rutland Rd default
  }, [originCoords, activeLeg, route.origin_coords]);

  // Active directions with headsUpAnnounced and turnAnnounced tracking
  const directionsRef = useRef<TurnByTurnInstruction[]>([]);
  useEffect(() => {
    const raw = activeLeg?.directions || steps || route.directions || [];
    directionsRef.current = raw.map((d) => ({
      ...d,
      headsUpAnnounced: false,
      turnAnnounced: false
    }));
    setCurrentStepIndex(0);
  }, [currentLegIndex, activeLeg, steps, route.directions]);

  const activeDirections = directionsRef.current;
  const activeStep: TurnByTurnInstruction | undefined = activeDirections[currentStepIndex] || activeDirections[0];

  // --- NAVIGATION MODE: LIVE GPS VS. DESKTOP SIMULATION ---
  const [navMode, setNavMode] = useState<'gps' | 'simulation'>('gps');
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<number>(1); // 1x, 2x, 5x
  const [gpsStatusText, setGpsStatusText] = useState<string>('Acquiring Satellite Lock...');

  // Vehicle Position & Telemetry State
  const [isNavigating, setIsNavigating] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simProgress, setSimProgress] = useState<number>(0); // 0 to 1 along current leg
  const [vehicleCoords, setVehicleCoords] = useState<[number, number]>(resolvedOriginLngLat);
  const [speedKmh, setSpeedKmh] = useState<number>(navMode === 'gps' ? 0 : 50);

  const handleStartNavigation = () => {
    // Prime mobile audio engine immediately on tap
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const unlock = new SpeechSynthesisUtterance('Navigation started');
      unlock.volume = 0.5;
      window.speechSynthesis.speak(unlock);
    }
    setIsNavigating(true);
  };

  // --- VOICE SELECTOR & SPEECH SYNTHESIS STATE ---
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Load available voices from browser and sync with localStorage
  useEffect(() => {
    const updateVoices = () => {
      const available = getAvailableVoices();
      setVoices(available);
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_STORAGE_KEY) : null;
      if (saved && available.some((v) => v.name === saved)) {
        setSelectedVoice(saved);
      } else if (available.length > 0) {
        setSelectedVoice(available[0].name);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    saveSelectedVoice(voiceName);
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    testVoice(selectedVoice);
    setTimeout(() => setIsTestingVoice(false), 2200);
  };

  // Stop Arrival & CRA Mileage Modal
  const [showArrivalModal, setShowArrivalModal] = useState<boolean>(false);
  const [selectedPurpose, setSelectedPurpose] = useState<PurposeTag>('Sales Call / Inbound Inquiry');
  const [tripNotes, setTripNotes] = useState<string>('');
  const [isSavingLeg, setIsSavingLeg] = useState<boolean>(false);
  const [isAddingToCrm, setIsAddingToCrm] = useState<boolean>(false);
  const [crmAddedToast, setCrmAddedToast] = useState<string | null>(null);

  useEffect(() => {
    if (showArrivalModal) {
      const currentStop = route.stops[currentLegIndex];
      if (currentStop?.purpose_tag) {
        setSelectedPurpose(currentStop.purpose_tag);
      }
      if (currentStop?.notes) {
        setTripNotes(currentStop.notes);
      }
      setCrmAddedToast(null);
    }
  }, [showArrivalModal, currentLegIndex, route.stops]);

  const handleAddToCrmPipeline = async () => {
    const legToLog = activeLeg || {
      originAddress: route.origin_address,
      destinationAddress: route.destination_address,
      distanceKm: route.total_distance_km,
      durationMin: route.total_duration_min,
      permitNumber: route.stops[0]?.permit_number
    };

    setIsAddingToCrm(true);
    try {
      const currentStop = route.stops[currentLegIndex];
      await CRMRepository.createManualDeal({
        address: legToLog.destinationAddress,
        project_name: `${legToLog.destinationAddress.split(',')[0]} Scope`,
        general_contractor: currentStop?.permit_number ? `Permit ${currentStop.permit_number}` : 'Public / Civic Inquiry',
        contact_name: 'On-Site Contact',
        subtrade_category: 'General Field Scope',
        stage: 'visited',
        quote_amount: 0,
        notes: tripNotes || `Customer inquiry recorded on-site during drive: ${selectedPurpose}`
      });
      setCrmAddedToast('✓ Deal added to CRM Pipeline as Site Visited!');
      setTimeout(() => setCrmAddedToast(null), 4000);
    } catch (err) {
      console.error('Failed to add deal to CRM:', err);
    } finally {
      setIsAddingToCrm(false);
    }
  };

  // Live Job Radar State
  const [radarAlerts, setRadarAlerts] = useState<JobRadarAlert[]>([]);
  const [dismissedRadarIds, setDismissedRadarIds] = useState<Set<string>>(new Set());

  // Web Speech synthesis voice queue with deduplication and arrival guards
  const lastSpokenRef = useRef<string>('');
  const arrivalAnnouncedRef = useRef<boolean>(false);

  const speakInstruction = (text: string, force: boolean = false) => {
    if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text || (!force && lastSpokenRef.current === text)) return;
    lastSpokenRef.current = text;
    try {
      speakNaturalUtil(text, selectedVoice);
    } catch {
      // Speech synthesis error handled gracefully
    }
  };

  // Check maneuver proximity for Two-Phase announcements
  const checkManeuverProximity = (currentCoords: [number, number]) => {
    const directions = directionsRef.current;
    for (let i = currentStepIndex; i < directions.length; i++) {
      const step = directions[i];
      if (!step.location) continue;

      const distM = getDistanceMeters(currentCoords, step.location);

      // Phase 1: Advance Heads-Up (<= 350m && > 80m)
      if (distM <= 350 && distM > 80 && !step.headsUpAnnounced) {
        step.headsUpAnnounced = true;
        const roundedMeters = Math.max(100, Math.round(distM / 50) * 50);
        speakInstruction(`In ${roundedMeters} meters, ${step.instruction}`);
        setCurrentStepIndex(i);
        break;
      }

      // Phase 2: Immediate Prompt (<= 40m)
      if (distM <= 40 && !step.turnAnnounced) {
        step.turnAnnounced = true;
        speakInstruction(step.instruction);
        setCurrentStepIndex(i);
        break;
      }
    }
  };

  // Determine current leg polyline coordinates
  const currentLegCoords = useMemo<[number, number][]>(() => {
    if (activeLeg && activeLeg.geometryCoordinates && activeLeg.geometryCoordinates.length > 1) {
      return activeLeg.geometryCoordinates;
    }
    if (routeGeometry?.geometry?.coordinates && routeGeometry.geometry.coordinates.length > 1) {
      return routeGeometry.geometry.coordinates;
    }
    if (routeGeometry?.coordinates && routeGeometry.coordinates.length > 1) {
      return routeGeometry.coordinates;
    }
    // Fallback: direct line from origin to destination
    const destLng = destinationCoords ? (destinationCoords[0] < 0 ? destinationCoords[0] : destinationCoords[1]) : route.destination_coords[1];
    const destLat = destinationCoords ? (destinationCoords[0] < 0 ? destinationCoords[1] : destinationCoords[0]) : route.destination_coords[0];
    return [resolvedOriginLngLat, [destLng, destLat]];
  }, [activeLeg, routeGeometry, destinationCoords, resolvedOriginLngLat, route.destination_coords]);

  // 1. Initialize MapLibre GL canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const [initLng, initLat] = resolvedOriginLngLat;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [initLng, initLat],
      zoom: 15,
      pitch: 50, // 3D In-Cab driver perspective
      bearing: 15,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      }
    });

    map.on('load', () => {
      map.resize();

      // Full Route Line from Circuit or RouteGeometry
      const geojsonData = circuitResult?.fullRoute || routeGeometry;
      if (geojsonData) {
        map.addSource('circuit-route-source', {
          type: 'geojson',
          data: geojsonData
        });

        // Glowing outer casing
        map.addLayer({
          id: 'circuit-route-casing',
          type: 'line',
          source: 'circuit-route-source',
          paint: {
            'line-color': '#1E3A8A',
            'line-width': 9,
            'line-opacity': 0.8
          }
        });

        // Inner glowing navigation line
        map.addLayer({
          id: 'circuit-route-line',
          type: 'line',
          source: 'circuit-route-source',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 5,
            'line-opacity': 0.95
          }
        });
      }

      // Add vehicle marker (custom DOM element)
      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'bpp-vehicle-puck';
      vehicleEl.innerHTML = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 26px; height: 26px; background: #2563EB; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `;

      vehicleMarkerRef.current = new maplibregl.Marker({ element: vehicleEl, rotationAlignment: 'map' })
        .setLngLat([initLng, initLat])
        .addTo(map);

      // Render Stop Markers: Orange for Civic Stops, Red for Permit Stops
      route.stops.forEach((stop, idx) => {
        const isCivic = stop.is_custom_address || !stop.permit_id;
        const stopEl = document.createElement('div');
        stopEl.innerHTML = `
          <div style="background: ${isCivic ? '#f59e0b' : '#dc2626'}; color: ${isCivic ? '#0f172a' : '#ffffff'}; font-weight: 900; font-size: 11px; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4);">
            ${idx + 1}
          </div>
        `;
        const marker = new maplibregl.Marker({ element: stopEl })
          .setLngLat([stop.longitude, stop.latitude])
          .addTo(map);
        stopMarkersRef.current.push(marker);
      });
    });

    mapRef.current = map;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      vehicleMarkerRef.current?.remove();
      stopMarkersRef.current.forEach((m) => m.remove());
      map.remove();
    };
  }, []);

  // 2. Announce initial direction once on start
  useEffect(() => {
    if (activeStep?.instruction && !showArrivalModal && !arrivalAnnouncedRef.current) {
      speakInstruction(activeStep.instruction);
    }
  }, [currentLegIndex, showArrivalModal]);

  // --- 3A. MODE A: REAL-TIME SATELLITE GPS NAVIGATION ---
  useEffect(() => {
    if (navMode !== 'gps') return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatusText('GPS Unavailable on this device');
      return;
    }

    setGpsStatusText('Acquiring Satellite Lock...');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);
        setGpsStatusText(`Live GPS Active (±${accuracy}m)`);

        const speed =
          pos.coords.speed !== null && pos.coords.speed !== undefined
            ? Math.round(pos.coords.speed * 3.6)
            : 0;
        setSpeedKmh(speed);

        setVehicleCoords([lng, lat]);
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLngLat([lng, lat]);
        }

        if (mapRef.current) {
          mapRef.current.easeTo({
            center: [lng, lat],
            zoom: 16.5,
            bearing: pos.coords.heading || 15,
            duration: 800
          });
        }

        // Trigger Two-Phase announcements from real GPS position
        checkManeuverProximity([lng, lat]);

        // Destination Arrival Proximity Check (within 35m)
        const destCoords: [number, number] = activeLeg
          ? [activeLeg.destinationCoords[1], activeLeg.destinationCoords[0]]
          : [route.destination_coords[1], route.destination_coords[0]];
        const distToDest = getDistanceMeters([lng, lat], destCoords);

        if (distToDest <= 35 && !arrivalAnnouncedRef.current) {
          arrivalAnnouncedRef.current = true;
          const destName = activeLeg?.destinationAddress?.split(',')[0] || route.destination_address.split(',')[0];
          speakInstruction(`You have arrived at your destination: ${destName}`, true);
          setShowArrivalModal(true);
        }
      },
      (err) => {
        console.warn('GPS watch error:', err);
        setGpsStatusText('GPS Searching...');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [navMode, activeLeg, route.destination_coords]);

  // --- 3B. MODE B: DESKTOP SIMULATION PREVIEW (1x, 2x, 5x) ---
  useEffect(() => {
    if (navMode !== 'simulation' || !isSimulating || currentLegCoords.length === 0) return;

    setSpeedKmh(Math.round(48 * simSpeedMultiplier));

    const coords = currentLegCoords;
    const stepIncrement = 0.015 * simSpeedMultiplier;

    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + stepIncrement;

        if (next >= 1) {
          clearInterval(interval);
          setIsSimulating(false);
          setSpeedKmh(0);

          if (!arrivalAnnouncedRef.current) {
            arrivalAnnouncedRef.current = true;
            const destName = activeLeg?.destinationAddress?.split(',')[0] || route.destination_address.split(',')[0];
            speakInstruction(`You have arrived at your destination: ${destName}`, true);
          }

          setShowArrivalModal(true);
          return 1;
        }

        // Interpolate position along polyline
        const indexFloat = next * (coords.length - 1);
        const lowIdx = Math.floor(indexFloat);
        const highIdx = Math.min(lowIdx + 1, coords.length - 1);
        const fraction = indexFloat - lowIdx;

        const p1 = coords[lowIdx];
        const p2 = coords[highIdx];
        const currentLng = p1[0] + (p2[0] - p1[0]) * fraction;
        const currentLat = p1[1] + (p2[1] - p1[1]) * fraction;

        setVehicleCoords([currentLng, currentLat]);

        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLngLat([currentLng, currentLat]);
        }

        if (mapRef.current) {
          mapRef.current.easeTo({
            center: [currentLng, currentLat],
            zoom: 16.5,
            duration: 600
          });
        }

        // Check maneuver proximity
        checkManeuverProximity([currentLng, currentLat]);

        // Fallback step advance if steps don't have exact maneuver locations
        const directions = directionsRef.current;
        if (directions.length > 1) {
          const targetStep = Math.min(Math.floor(next * directions.length), directions.length - 1);
          if (
            targetStep !== currentStepIndex &&
            !directions[targetStep].headsUpAnnounced &&
            !directions[targetStep].turnAnnounced
          ) {
            setCurrentStepIndex(targetStep);
          }
        }

        return next;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [navMode, isSimulating, currentLegCoords, currentStepIndex, simSpeedMultiplier]);

  // 4. Live Job Radar Scanner: Scan nearby permits against vehicleCoords
  useEffect(() => {
    if (!vehicleCoords || allPermits.length === 0) return;

    const [vLng, vLat] = vehicleCoords;
    const routeStopPermitIds = new Set(route.stops.map((s) => s.permit_id || ''));

    const detected: JobRadarAlert[] = [];

    for (const permit of allPermits) {
      if (routeStopPermitIds.has(permit.id) || dismissedRadarIds.has(permit.id)) continue;
      if (!permit.latitude || !permit.longitude) continue;

      const distM = getDistanceMeters([vLng, vLat], [permit.longitude, permit.latitude]);
      const distKm = distM / 1000;

      // Proximity threshold: within 1.8 km
      if (distKm <= 1.8) {
        detected.push({
          permit,
          distanceMeters: Math.round(distM),
          distanceKm: distKm.toFixed(1),
          detectedAt: new Date().toISOString()
        });
      }
    }

    setRadarAlerts(detected.sort((a, b) => a.distanceMeters - b.distanceMeters));
  }, [vehicleCoords, allPermits, dismissedRadarIds, route.stops]);

  // Handler: Confirm Arrival and Log Leg to CRA Mileage Tracker
  const handleConfirmArrivalAndLogLeg = async () => {
    const legToLog = activeLeg || {
      originAddress: route.origin_address,
      destinationAddress: route.destination_address,
      distanceKm: route.total_distance_km,
      durationMin: route.total_duration_min,
      permitNumber: route.stops[0]?.permit_number
    };

    setIsSavingLeg(true);

    try {
      const currentStop = route.stops[currentLegIndex];
      const loggedLeg = await MileageRepository.logTripLeg({
        origin_address: legToLog.originAddress,
        destination_address: legToLog.destinationAddress,
        distance_km: legToLog.distanceKm,
        duration_min: legToLog.durationMin,
        trip_type: 'business',
        purpose_tag: selectedPurpose,
        permit_id: currentStop?.permit_id,
        permit_number: legToLog.permitNumber || currentStop?.permit_number,
        route_id: route.id,
        leg_number: currentLegIndex + 1,
        notes: tripNotes || `Completed stop at ${legToLog.destinationAddress.split(',')[0]}`
      });

      if (currentStop && onStopCompleted) {
        onStopCompleted(currentStop.id, loggedLeg);
      }

      setShowArrivalModal(false);

      // Check if there are more legs in the circuit
      if (currentLegIndex + 1 < legs.length) {
        arrivalAnnouncedRef.current = false;
        lastSpokenRef.current = '';
        setCurrentLegIndex((prev) => prev + 1);
        setCurrentStepIndex(0);
        setSimProgress(0);
        if (navMode === 'simulation') {
          setIsSimulating(true);
          setSpeedKmh(Math.round(48 * simSpeedMultiplier));
        }
        speakInstruction(`Navigating to Next Stop: ${legs[currentLegIndex + 1].destinationAddress.split(',')[0]}`, true);
      } else {
        speakInstruction('All circuit stops completed. Great work today.', true);
      }
    } catch (err) {
      console.error('Error logging trip leg:', err);
    } finally {
      setIsSavingLeg(false);
    }
  };

  // Helper for maneuver icons
  const renderManeuverIcon = (instruction: string) => {
    const lower = instruction.toLowerCase();
    if (lower.includes('left')) return <CornerUpLeft className="w-8 h-8 text-white" />;
    if (lower.includes('right')) return <CornerUpRight className="w-8 h-8 text-white" />;
    if (lower.includes('arrive') || lower.includes('stop')) return <MapPin className="w-8 h-8 text-emerald-400" />;
    return <ArrowUp className="w-8 h-8 text-white" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden text-white font-sans select-none">
      {/* 1. TOP MANEUVER & AUDIO HUD BANNER */}
      <div className="h-24 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-2xl">
        {/* Left: Maneuver Guidance */}
        <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            {renderManeuverIcon(activeStep?.instruction || '')}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {activeStep?.distanceText || '350m'}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                Next Maneuver
              </span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-slate-100 truncate max-w-sm sm:max-w-md md:max-w-lg">
              {activeStep?.instruction || 'Continue along the active route'}
            </p>
          </div>
        </div>

        {/* Center: Live GPS vs. Desktop Simulation Toggle */}
        <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-xl">
          <button
            type="button"
            onClick={() => {
              setNavMode('gps');
              setIsSimulating(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all ${
              navMode === 'gps'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>🛰️ Live GPS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNavMode('simulation');
              setIsSimulating(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all ${
              navMode === 'simulation'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>▶️ Test Drive Simulation</span>
          </button>
        </div>

        {/* Right: Audio Voice Selector & Cockpit Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Voice Dropdown */}
          <div className="hidden md:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-2xl px-2.5 py-1.5">
            <Volume2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none max-w-[130px] xl:max-w-[170px] truncate"
              title="Select In-Cab Navigation Voice"
            >
              {voices.length === 0 ? (
                <option value="">Default Voice</option>
              ) : (
                voices.map((v) => (
                  <option key={v.name} value={v.name} className="bg-slate-900 text-white">
                    {v.name} {v.isNatural ? '★' : ''}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={isTestingVoice || !selectedVoice}
              title="Test Voice: speaks 'Navigation voice ready.'"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                isTestingVoice
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white'
              }`}
            >
              Test
            </button>
          </div>

          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
              isVoiceEnabled
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle Voice Guidance"
          >
            {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Exit In-App Drive Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Mode Switcher Bar */}
      <div className="lg:hidden h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => {
              setNavMode('gps');
              setIsSimulating(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
              navMode === 'gps' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            🛰️ Live GPS
          </button>
          <button
            type="button"
            onClick={() => {
              setNavMode('simulation');
              setIsSimulating(true);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
              navMode === 'simulation' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            ▶️ Simulation
          </button>
        </div>

        {navMode === 'simulation' && (
          <div className="flex items-center space-x-1">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeedMultiplier(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  simSpeedMultiplier === spd ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. CENTER INTERACTIVE IN-CAB MAP CANVAS */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-slate-900">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Live Job Radar Proximity Overlay */}
        <JobRadarOverlay
          alerts={radarAlerts}
          onAddStopAsNext={(permit) => {
            if (onAddDivertStop) {
              onAddDivertStop(permit);
            }
            setDismissedRadarIds((prev) => new Set(prev).add(permit.id));
          }}
          onDismissAlert={(permitId) => {
            setDismissedRadarIds((prev) => new Set(prev).add(permitId));
          }}
          isMuted={isMuted}
        />

        {/* Floating Mode Indicator Badge (Top Left of Map) */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
          {navMode === 'gps' ? (
            <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-800 text-emerald-400 px-3 py-1.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>{gpsStatusText}</span>
            </div>
          ) : (
            <div className="bg-slate-950/90 backdrop-blur-md border border-blue-800 text-blue-400 px-3 py-1.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Desktop Simulation ({simSpeedMultiplier}x Speed)</span>
            </div>
          )}
        </div>

        {/* Floating In-Cab Telemetry Card (Speedometer & Progress) */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center space-x-3 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3">
            <div className="text-center font-mono">
              <span className="text-3xl font-black text-white">{speedKmh}</span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">KM/H</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Leg Progress</span>
              <span className="text-sm font-black text-blue-400 font-mono">
                {Math.round(simProgress * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Floating Controls: Simulation Speed Controls or Live GPS info */}
        <div className="absolute bottom-6 right-6 z-20 flex items-center space-x-2">
          {navMode === 'simulation' && (
            <>
              {/* Playback Speed Multiplier (1x, 2x, 5x) */}
              <div className="hidden sm:flex items-center space-x-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-1 rounded-2xl shadow-xl">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Speed:</span>
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSimSpeedMultiplier(spd)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                      simSpeedMultiplier === spd
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Pause / Resume Button */}
              <button
                onClick={() => {
                  if (!isSimulating) {
                    handleStartNavigation();
                    setIsSimulating(true);
                  } else {
                    setIsSimulating(false);
                    setIsNavigating(false);
                  }
                }}
                className="p-3 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold transition-all"
              >
                {isSimulating ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                <span>{isSimulating ? 'Pause' : 'Resume'}</span>
              </button>
            </>
          )}

          {/* Arrived at Stop Confirmation */}
          <button
            onClick={() => {
              setIsSimulating(false);
              setShowArrivalModal(true);
            }}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-xl flex items-center space-x-2 transition-transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Arrived at Stop</span>
          </button>
        </div>
      </div>

      {/* 3. BOTTOM IN-CAB COCKPIT BAR */}
      <div className="h-20 bg-slate-950 border-t border-slate-800 px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-sm text-emerald-400">
            {currentLegIndex + 1}/{legs.length || route.stops.length || 1}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Active Circuit Stop</span>
              {activeLeg?.permitNumber && (
                <span className="text-[10px] font-mono font-bold bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800">
                  {activeLeg.permitNumber}
                </span>
              )}
            </div>
            <p className="text-sm font-extrabold text-white truncate max-w-md">
              {activeLeg?.destinationAddress || route.destination_address}
            </p>
          </div>
        </div>

        {/* Remaining Leg Distance & ETA */}
        <div className="flex items-center space-x-6 text-right font-mono">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining</span>
            <span className="text-base font-black text-white">
              {activeLeg ? (activeLeg.distanceKm * (1 - simProgress)).toFixed(1) : '0.0'} km
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated</span>
            <span className="text-base font-black text-emerald-400">
              {activeLeg ? Math.max(1, Math.round(activeLeg.durationMin * (1 - simProgress))) : 0} min
            </span>
          </div>
        </div>
      </div>

      {/* 4. MODAL: ARRIVAL & CRA MILEAGE LOGBOOK ENTRY */}
      {showArrivalModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Log CRA Trip Leg</h3>
                  <p className="text-xs text-slate-400">Auto-calculated deductible commercial mileage</p>
                </div>
              </div>

              <button
                onClick={() => setShowArrivalModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Leg Metrics Summary */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Distance</span>
                <span className="text-lg font-black font-mono text-white">
                  {activeLeg?.distanceKm || route.total_distance_km} km
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Time</span>
                <span className="text-lg font-black font-mono text-white">
                  {activeLeg?.durationMin || route.total_duration_min} min
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 block">CRA Allowance</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  ${(((activeLeg?.distanceKm || route.total_distance_km) * 0.70)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">From:</span>
                  <span className="font-semibold text-slate-200">
                    {activeLeg?.originAddress || route.origin_address}
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">To (Job Site):</span>
                  <span className="font-semibold text-white">
                    {activeLeg?.destinationAddress || route.destination_address}
                  </span>
                </div>
              </div>
            </div>

            {/* CRA Purpose Tag Selector */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                CRA Purpose Tag
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  'Sales Call / Inbound Inquiry',
                  'Site Measure / Pre-Walk',
                  'Warranty / Service Check',
                  'Installer / Crew Checkup',
                  'Office / Base',
                  'Personal / Lunch'
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedPurpose(tag as PurposeTag)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all truncate text-left ${
                      selectedPurpose === tag
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                    title={tag}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Driver Notes */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Driver Notes / Job Log
              </label>
              <input
                type="text"
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="e.g. Discussed scope with superintendent or customer inquiry on site"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Actions: Log Leg & Add to CRM */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleConfirmArrivalAndLogLeg}
                disabled={isSavingLeg}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingLeg ? 'Logging to CRA Logbook...' : 'Log CRA Leg & Continue Route'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddToCrmPipeline}
                disabled={isAddingToCrm}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Columns className="w-3.5 h-3.5 text-purple-400" />
                <span>{isAddingToCrm ? 'Adding Deal to Pipeline...' : '+ Add Inquiry to CRM Pipeline (Site Visited)'}</span>
              </button>

              {crmAddedToast && (
                <div className="text-[11px] text-emerald-400 font-bold text-center pt-1 animate-in fade-in">
                  {crmAddedToast}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
