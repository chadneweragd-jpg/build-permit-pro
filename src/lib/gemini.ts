import { GoogleGenAI } from '@google/genai';
import { SubtradeKey } from '@/types';
import { SUBTRADES_CATALOG } from './trades-data';

const apiKey = process.env.GEMINI_API_KEY || '';

export const isGeminiConfigured = Boolean(apiKey && !apiKey.includes('placeholder') && !apiKey.includes('your-key'));

const ai = isGeminiConfigured ? new GoogleGenAI({ apiKey }) : null;

export interface GeminiPermitAnalysis {
  trades: {
    subtrade_key: SubtradeKey;
    confidence: number;
    reasoning: string;
  }[];
  flashSummary: string;
  keyEquipment: string[];
  riskFactors: string[];
  source: 'gemini_api' | 'heuristic_engine';
}

export async function analyzePermitWithGemini(options: {
  permitNumber: string;
  address: string;
  workClass: string;
  estimatedValue: number;
  description: string;
}): Promise<GeminiPermitAnalysis> {
  const { permitNumber, address, workClass, estimatedValue, description } = options;

  if (isGeminiConfigured && ai) {
    try {
      const prompt = `You are Build Permit Pro's AI Chief Estimator for Canadian trade contractors.
Analyze this municipal building permit from City of Kelowna, BC:

Permit Number: ${permitNumber}
Address: ${address}
Work Class: ${workClass}
Estimated Value: $${estimatedValue.toLocaleString('en-CA')} CAD
Raw Municipal Scope Description: "${description}"

Supported Subtrades:
- electrical (Electrical, 400A/600V, panels, transformers, EV chargers, lighting, backup generator)
- hvac_plumbing (Plumbing & Mechanical / HVAC, RTUs, chillers, boilers, heat pumps, hydronics, drainage)
- roofing (Roofing & Sheet Metal, TPO, SBS membrane, asphalt shingles, metal roof, parapets)
- drywall_framing (Drywall & Steel Stud, acoustic ceilings, gypsum board, demising walls, tenant improvements)
- commercial_doors (Commercial Overhead Doors & Dock, high-speed doors, dock levelers, seals)
- glazing (Glazing & Building Envelope, curtain walls, aluminum storefronts, low-E glass)
- concrete (Concrete & Foundations, tilt-up, parkade slabs, footings, grade beams)
- framing (Framing & Structural Timber, mass timber, CLT, wood framing, trusses)

Respond ONLY with valid JSON in this exact structure:
{
  "trades": [
    {
      "subtrade_key": "electrical",
      "confidence": 0.95,
      "reasoning": "Explicit mention of high-voltage service."
    }
  ],
  "flashSummary": "Two concise plain-English sentences highlighting project scope and trade bidding opportunities for estimators.",
  "keyEquipment": ["400A Main Switchgear", "TPO Single-Ply Membrane", "Hydraulic Dock Levelers"],
  "riskFactors": ["Seismic bracing requirements in Okanagan zone", "High-capacity transformer lead times"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text?.trim() || '';
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return {
          trades: parsed.trades || [],
          flashSummary: parsed.flashSummary || description,
          keyEquipment: parsed.keyEquipment || [],
          riskFactors: parsed.riskFactors || [],
          source: 'gemini_api'
        };
      }
    } catch (err) {
      console.warn('Gemini API call error, falling back to heuristic estimator engine:', err);
    }
  }

  // Resilient Heuristic Fallback
  const lowerDesc = description.toLowerCase();
  const matchedTrades: GeminiPermitAnalysis['trades'] = [];
  const keyEquipment: string[] = [];
  const riskFactors: string[] = [];

  if (lowerDesc.includes('electr') || lowerDesc.includes('panel') || lowerDesc.includes('600v') || lowerDesc.includes('lighting')) {
    matchedTrades.push({ subtrade_key: 'electrical', confidence: 0.95, reasoning: 'Electrical distribution or lighting work detected.' });
    keyEquipment.push('Main Service Panel / Switchgear', 'LED Commercial Lighting Packages');
  }
  if (lowerDesc.includes('hvac') || lowerDesc.includes('heat pump') || lowerDesc.includes('chiller') || lowerDesc.includes('plumb')) {
    matchedTrades.push({ subtrade_key: 'hvac_plumbing', confidence: 0.9, reasoning: 'Mechanical systems, RTUs or plumbing fixtures specified.' });
    keyEquipment.push('Commercial Heat Pump / RTU', 'Hydronic Piping & Backflow Devices');
  }
  if (lowerDesc.includes('roof') || lowerDesc.includes('tpo') || lowerDesc.includes('membrane')) {
    matchedTrades.push({ subtrade_key: 'roofing', confidence: 0.85, reasoning: 'Building envelope roofing or membrane replacement scope.' });
    keyEquipment.push('Single-Ply TPO / 2-Ply SBS Membrane', 'Parapet Sheet Metal Flashings');
  }
  if (lowerDesc.includes('overhead door') || lowerDesc.includes('dock') || lowerDesc.includes('bay door')) {
    matchedTrades.push({ subtrade_key: 'commercial_doors', confidence: 0.9, reasoning: 'Loading dock or industrial overhead door requirement.' });
    keyEquipment.push('Commercial Sectional Bay Doors', 'Hydraulic Dock Levelers');
  }
  if (lowerDesc.includes('drywall') || lowerDesc.includes('steel stud') || lowerDesc.includes('tenant improvement')) {
    matchedTrades.push({ subtrade_key: 'drywall_framing', confidence: 0.85, reasoning: 'Interior partition walls and ceiling assemblies.' });
    keyEquipment.push('Steel Stud Framing Bundles', 'Acoustic T-Bar Ceiling Tiles');
  }
  if (lowerDesc.includes('glaz') || lowerDesc.includes('curtain wall') || lowerDesc.includes('storefront')) {
    matchedTrades.push({ subtrade_key: 'glazing', confidence: 0.85, reasoning: 'Exterior aluminum glazing and thermal glass envelope.' });
    keyEquipment.push('Thermally Broken Aluminum Storefront', 'Low-E Insulated Glazing Units');
  }
  if (lowerDesc.includes('concrete') || lowerDesc.includes('slab') || lowerDesc.includes('foundation') || lowerDesc.includes('tilt-up')) {
    matchedTrades.push({ subtrade_key: 'concrete', confidence: 0.88, reasoning: 'Structural concrete, foundation or slab-on-grade work.' });
    keyEquipment.push('Reinforced Slab-on-Grade', 'Concrete Pump & Formwork');
  }

  // Fallback if none matched
  if (matchedTrades.length === 0) {
    matchedTrades.push({ subtrade_key: 'electrical', confidence: 0.6, reasoning: 'Standard trade involvement in commercial construction.' });
  }

  riskFactors.push(
    'City of Kelowna inspection turnaround timelines on rough-in milestones',
    'Supply chain lead times for specialized 3-phase commercial electrical and mechanical gear'
  );

  const formattedVal = `$${estimatedValue.toLocaleString('en-CA')}`;
  const flashSummary = `${workClass} permit for ${address} (${formattedVal}), involving ${description.slice(0, 100).toLowerCase()}... Key trade opportunities identified for immediate estimator review and quote preparation.`;

  return {
    trades: matchedTrades,
    flashSummary,
    keyEquipment: keyEquipment.length > 0 ? keyEquipment : ['Standard Trade Commercial Assemblies'],
    riskFactors,
    source: 'heuristic_engine'
  };
}
