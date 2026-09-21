import { SubtradeKey } from '@/types';

export interface SubtradeDefinition {
  key: SubtradeKey;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  icon: string;
  description: string;
}

export const SUBTRADES_CATALOG: Record<SubtradeKey, SubtradeDefinition> = {
  electrical: {
    key: 'electrical',
    name: 'Electrical',
    color: '#2563EB',
    badgeBg: 'bg-blue-100 text-blue-800',
    badgeText: 'text-blue-600',
    borderClass: 'border-blue-500',
    icon: 'Zap',
    description: 'High/low voltage, panels, transformers, lighting, EV charging, generators'
  },
  hvac_plumbing: {
    key: 'hvac_plumbing',
    name: 'Plumbing & Mechanical / HVAC',
    color: '#DC2626',
    badgeBg: 'bg-red-100 text-red-800',
    badgeText: 'text-red-600',
    borderClass: 'border-red-500',
    icon: 'Flame',
    description: 'Boilers, chillers, RTUs, heat pumps, hydronics, drainage, medical gas'
  },
  roofing: {
    key: 'roofing',
    name: 'Roofing & Sheet Metal',
    color: '#16A34A',
    badgeBg: 'bg-green-100 text-green-800',
    badgeText: 'text-green-600',
    borderClass: 'border-green-500',
    icon: 'Home',
    description: 'TPO, 2-ply SBS membranes, metal roofing, parapet flashings, shingles'
  },
  drywall_framing: {
    key: 'drywall_framing',
    name: 'Drywall & Steel Stud',
    color: '#D97706',
    badgeBg: 'bg-amber-100 text-amber-800',
    badgeText: 'text-amber-600',
    borderClass: 'border-amber-500',
    icon: 'Layers',
    description: 'Steel stud partitions, gypsum drywall, acoustic t-bar ceilings, taping'
  },
  commercial_doors: {
    key: 'commercial_doors',
    name: 'Commercial Overhead Doors & Dock',
    color: '#EA580C',
    badgeBg: 'bg-orange-100 text-orange-800',
    badgeText: 'text-orange-600',
    borderClass: 'border-orange-500',
    icon: 'DoorOpen',
    description: 'Sectional bay doors, roll-up high-speed doors, dock levelers, seals'
  },
  glazing: {
    key: 'glazing',
    name: 'Glazing & Building Envelope',
    color: '#0891B2',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    badgeText: 'text-cyan-600',
    borderClass: 'border-cyan-500',
    icon: 'Maximize',
    description: 'Curtain walls, aluminum storefronts, low-E glass, architectural cladding'
  },
  concrete: {
    key: 'concrete',
    name: 'Concrete & Foundations',
    color: '#4B5563',
    badgeBg: 'bg-slate-200 text-slate-800',
    badgeText: 'text-slate-600',
    borderClass: 'border-slate-500',
    icon: 'Hammer',
    description: 'Tilt-up panels, slabs-on-grade, footings, grade beams, post-tension parkades'
  },
  framing: {
    key: 'framing',
    name: 'Framing & Structural Timber',
    color: '#9333EA',
    badgeBg: 'bg-purple-100 text-purple-800',
    badgeText: 'text-purple-600',
    borderClass: 'border-purple-500',
    icon: 'Box',
    description: 'Mass timber, CLT panels, engineered wood trusses, heavy timber posts'
  }
};

export const REGIONS_CATALOG = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'okanagan-valley',
    name: 'The Okanagan Valley Hub',
    province: 'BC',
    cities: ['Kelowna', 'West Kelowna', 'Lake Country', 'Vernon', 'Penticton'],
    center: [49.888, -119.496] as [number, number],
    zoom: 11
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    slug: 'lower-mainland',
    name: 'Greater Vancouver & Lower Mainland Hub',
    province: 'BC',
    cities: ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam'],
    center: [49.2827, -123.1207] as [number, number],
    zoom: 10
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    slug: 'calgary-metro',
    name: 'Calgary Metropolitan Region',
    province: 'AB',
    cities: ['Calgary', 'Airdrie', 'Cochrane', 'Okotoks'],
    center: [51.0447, -114.0719] as [number, number],
    zoom: 10
  }
];

export const SUBSCRIPTION_TIERS = {
  solo: {
    tier: 'solo' as const,
    name: 'Regional Solo',
    priceCAD: 129,
    hubsLimit: 1,
    tradesLimit: 1,
    hasScoutCorridor: false,
    seatsLimit: 1,
    hasWebhooks: false,
    description: 'For specialized independent trade contractors focusing on 1 primary trade in 1 regional hub.'
  },
  pro_scout: {
    tier: 'pro_scout' as const,
    name: 'Regional Pro / Scout',
    priceCAD: 199,
    hubsLimit: 1,
    tradesLimit: 'all' as const,
    hasScoutCorridor: true,
    seatsLimit: 3,
    hasWebhooks: false,
    description: 'Most Popular: Unlocks BPP Scout corridor slider, all trades, multi-trade alerts & 3 team seats.'
  },
  supplier: {
    tier: 'supplier' as const,
    name: 'Provincial Supplier',
    priceCAD: 499,
    hubsLimit: 'all' as const,
    tradesLimit: 'all' as const,
    hasScoutCorridor: true,
    seatsLimit: 'unlimited' as const,
    hasWebhooks: true,
    description: 'For building material distributors, equipment dealers, and enterprise trade estimators.'
  }
};
