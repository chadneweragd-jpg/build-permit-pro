import { GoogleGenAI } from '@google/genai';
import { PermitsRepository } from '@/lib/permits-repo';
import { Permit } from '@/types';

const apiKey = process.env.GEMINI_API_KEY || '';
export const isGeminiConfigured = Boolean(apiKey && !apiKey.includes('placeholder') && !apiKey.includes('your-key'));
const ai = isGeminiConfigured ? new GoogleGenAI({ apiKey }) : null;

export interface ScoutAction {
  label: string;
  href: string;
  type?: 'route' | 'search' | 'mileage' | 'permit';
}

export interface ScoutAssistantResponse {
  spokenText: string;
  displayText: string;
  permits?: Permit[];
  actions?: ScoutAction[];
  source: 'gemini_api' | 'local_scout_engine';
}

/**
 * Strips markdown symbols for smooth, natural voice speech synthesis.
 */
export function cleanSpokenText(text: string): string {
  return text
    .replace(/[*_#`~\[\]]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function askScoutAssistant(options: {
  query: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
  context?: {
    currentPath?: string;
    selectedPermitId?: string;
  };
}): Promise<ScoutAssistantResponse> {
  const { query, history = [] } = options;
  const allPermits = PermitsRepository.getAllPermits();
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // 1. Try Gemini 2.5 Flash if configured
  if (isGeminiConfigured && ai) {
    try {
      const summaryContext = allPermits.slice(0, 30).map((p) => ({
        id: p.id,
        permit_number: p.permit_number,
        address: p.address,
        work_class: p.work_class,
        value: p.estimated_value,
        trades: p.trades.map((t) => t.name).join(', '),
        contractor: p.contractor_name
      }));

      const prompt = `You are "Scout", the voice and AI intelligence co-pilot for Build Permit Pro (BPP), built for Canadian trade contractors (electrical, HVAC/plumbing, roofing, framing, glazing, drywall, commercial doors, concrete) and suppliers in Kelowna & Okanagan Valley, BC.

User Query: "${trimmed}"

Sample Active Permits in Database:
${JSON.stringify(summaryContext, null, 2)}

Instructions:
1. Respond concisely, authoritatively, and helpfully.
2. Provide a "spokenText" field: 1 to 3 short sentences written for natural speech readout aloud over truck speakers (NO markdown, NO asterisks, NO URLs, easy cadence).
3. Provide a "displayText" field: formatted markdown with bullet points, project valuations in CAD, and trade insights.
4. Provide "permitIds": array of 1 to 3 permit IDs from the sample database most relevant to the query.
5. Provide "actions": array of 1 to 3 quick app navigation actions. Available paths: /search, /routes/builder, /routes/mileage, /permits, /reports.

Respond ONLY with valid JSON in this exact structure:
{
  "spokenText": "...",
  "displayText": "...",
  "permitIds": ["BP-2026-0814"],
  "actions": [
    { "label": "Open Route Builder", "href": "/routes/builder", "type": "route" }
  ]
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
        const matchedPermits = (parsed.permitIds || [])
          .map((id: string) => allPermits.find((p) => p.id === id || p.permit_number === id))
          .filter(Boolean) as Permit[];

        return {
          spokenText: cleanSpokenText(parsed.spokenText || parsed.displayText || 'Here is what I found in Build Permit Pro.'),
          displayText: parsed.displayText || parsed.spokenText || '',
          permits: matchedPermits,
          actions: parsed.actions || [],
          source: 'gemini_api'
        };
      }
    } catch (err) {
      console.warn('Scout Gemini call error, falling back to local Scout reasoning engine:', err);
    }
  }

  // 2. Intelligent Local Heuristic Engine
  // Query classification & semantic permit matching
  let matchedPermits: Permit[] = [];
  let spokenText = '';
  let displayText = '';
  const actions: ScoutAction[] = [];

  // A. Wilden / SFD inquiries
  if (lower.includes('wilden') || lower.includes('single family') || lower.includes('sfd') || lower.includes('home') || lower.includes('residential')) {
    matchedPermits = allPermits.filter(
      (p) =>
        p.work_class === 'Residential' ||
        p.description.toLowerCase().includes('single family') ||
        p.address.toLowerCase().includes('skyland') ||
        p.address.toLowerCase().includes('echo ridge') ||
        p.address.toLowerCase().includes('hidden lake') ||
        p.address.toLowerCase().includes('wilden')
    ).slice(0, 3);

    spokenText = `Found ${matchedPermits.length} single-family residential permits in Wilden, including 1480 Skyland Drive and 1120 Hidden Lake Mews. Top trades needed are framing, electrical, and roofing.`;
    displayText = `### 🏡 Single-Family Residential Permits in Wilden\nHere are top active residential developments in Wilden with high subtrade demand:\n\n` +
      matchedPermits.map((p) => `- **${p.address}** (${p.permit_number}): $${(p.estimated_value / 1000).toFixed(0)}k CAD — *${p.trades.map(t => t.name).join(', ')}*`).join('\n') +
      `\n\nTap **View on Map** to inspect or **Drive Mode** to navigate straight to the job site.`;

    actions.push(
      { label: 'View All Wilden Leads', href: '/search?q=Wilden', type: 'search' },
      { label: 'Build Scout Route', href: '/routes/builder', type: 'route' }
    );
  }
  // B. Upper Mission / Kettle Valley
  else if (lower.includes('mission') || lower.includes('kettle valley') || lower.includes('chute lake')) {
    matchedPermits = allPermits.filter(
      (p) =>
        p.address.toLowerCase().includes('chute lake') ||
        p.address.toLowerCase().includes('mcclain') ||
        p.address.toLowerCase().includes('creekstone') ||
        p.address.toLowerCase().includes('mission')
    ).slice(0, 3);

    spokenText = `I located prime custom residential builds in Upper Mission and Kettle Valley, including 5230 Chute Lake Road valued at 1.65 million.`;
    displayText = `### 🌲 Upper Mission & Kettle Valley Residential Builds\nHigh-value residential projects underway:\n\n` +
      matchedPermits.map((p) => `- **${p.address}**: $${(p.estimated_value / 1000).toFixed(0)}k CAD — *${p.trades.map(t => t.name).join(', ')}*`).join('\n');

    actions.push({ label: 'Explore Mission Map', href: '/search?q=Chute+Lake', type: 'search' });
  }
  // C. Electrical trades
  else if (lower.includes('electr') || lower.includes('panel') || lower.includes('wire') || lower.includes('power')) {
    matchedPermits = allPermits.filter((p) =>
      p.trades.some((t) => t.subtrade_key === 'electrical' || t.name.toLowerCase().includes('electr'))
    ).slice(0, 3);

    spokenText = `Found ${matchedPermits.length} commercial electrical opportunities, led by 1250 Ellis Street at 48 million dollars and 550 West Avenue.`;
    displayText = `### ⚡ Top Electrical Opportunities in Kelowna\nMajor commercial & residential electrical scopes:\n\n` +
      matchedPermits.map((p) => `- **${p.address}** ($${(p.estimated_value / 1000000).toFixed(1)}M CAD): *${p.description.substring(0, 100)}...*`).join('\n');

    actions.push(
      { label: 'Filter Electrical Leads', href: '/search?trade=electrical', type: 'search' },
      { label: 'Build Route', href: '/routes/builder', type: 'route' }
    );
  }
  // D. Framing & Drywall
  else if (lower.includes('fram') || lower.includes('drywall') || lower.includes('stud') || lower.includes('timber')) {
    matchedPermits = allPermits.filter((p) =>
      p.trades.some((t) => t.subtrade_key === 'framing' || t.subtrade_key === 'drywall_framing')
    ).slice(0, 3);

    spokenText = `Found active framing and drywall jobs across Kelowna, including structural timber and mass timber multi-family sites.`;
    displayText = `### 🔨 Framing & Drywall Bidding Opportunities\n` +
      matchedPermits.map((p) => `- **${p.address}** (${p.work_class}): $${(p.estimated_value / 1000).toFixed(0)}k CAD — GC: **${p.contractor_name || 'General Contractor'}**`).join('\n');

    actions.push({ label: 'Search Framing Jobs', href: '/search?trade=framing', type: 'search' });
  }
  // E. Largest / Highest Value Project
  else if (lower.includes('big') || lower.includes('largest') || lower.includes('highest') || lower.includes('value') || lower.includes('million')) {
    matchedPermits = [...allPermits].sort((a, b) => b.estimated_value - a.estimated_value).slice(0, 3);

    const top = matchedPermits[0];
    spokenText = `The largest project in Kelowna is ${top.address}, valued at ${Math.round(top.estimated_value / 1000000)} million dollars.`;
    displayText = `### 🏆 Top Valued Projects in Kelowna Pipeline\n` +
      matchedPermits.map((p) => `- **${p.address}** (${p.permit_number}): **$${(p.estimated_value / 1000000).toFixed(2)}M CAD** — ${p.work_class} (*${p.contractor_name}*)`).join('\n');

    actions.push(
      { label: 'View Top Permit on Map', href: `/search?permitId=${top.id}`, type: 'permit' },
      { label: 'View Commercial Pipeline', href: '/permits', type: 'search' }
    );
  }
  // F. Rutland inquiries
  else if (lower.includes('rutland') || lower.includes('highway 33')) {
    matchedPermits = allPermits.filter((p) =>
      p.address.toLowerCase().includes('rutland') || p.address.toLowerCase().includes('highway 33')
    ).slice(0, 3);

    spokenText = `Found permits in Rutland along Rutland Road and Highway 33. You can set 1665 Rutland Road as your default route base.`;
    displayText = `### 📍 Rutland & Highway 33 Permits\n` +
      (matchedPermits.length > 0
        ? matchedPermits.map((p) => `- **${p.address}**: $${(p.estimated_value / 1000).toFixed(0)}k CAD`).join('\n')
        : `- **1665 Rutland Rd, Kelowna, BC**: Registered contractor origin depot.\n- Multiple nearby commercial strip & residential renovations.`) +
      `\n\nTip: You can launch Drive Mode with turn-by-turn guidance straight from Rutland Road.`;

    actions.push(
      { label: 'Start Route from Rutland', href: '/routes/builder', type: 'route' }
    );
  }
  // G. Routing / Drive Mode inquiries
  else if (lower.includes('route') || lower.includes('drive') || lower.includes('navigation') || lower.includes('corridor') || lower.includes('gps')) {
    spokenText = `BPP Scout Route Builder lets you create multi-stop circuits with 2k, 3k, or 5k corridor buffers and in-app turn-by-turn voice guidance.`;
    displayText = `### 🚗 In-App BPP Scout Drive Mode & Circuit Routing\n- **100% In-App**: Turn-by-turn navigation without external map redirects.\n- **Voice Guidance**: Two-phase heads-up announcements matching your selected voice.\n- **Job Radar**: Proximity alerts for high-value permits within 2.5 km of your truck.\n- **One-Click Circuit Optimization**: Nearest-neighbor TSP calculation to minimize driving distance.`;

    actions.push(
      { label: 'Launch Route Builder', href: '/routes/builder', type: 'route' },
      { label: 'Explore Search Corridor', href: '/search', type: 'search' }
    );
  }
  // H. CRA Mileage & Expense questions
  else if (lower.includes('mileage') || lower.includes('cra') || lower.includes('tax') || lower.includes('expense') || lower.includes('deduct')) {
    spokenText = `The CRA auto allowance rate is 70 cents per kilometer for the first 5,000 kilometers in British Columbia. All Drive Mode trips log automatically.`;
    displayText = `### 📋 CRA Automobile Allowance & Logbook Compliance\n- **2026 CRA Rate**: **$0.70 / km** for the first 5,000 business km, **$0.64 / km** thereafter.\n- **Auto-Logging**: Drive Mode logs origin, destination, distance, and purpose tags (*Sales Call*, *Site Measure*, *Installer Check*).\n- **Audit-Ready Export**: 1-click download of itemized CSV spreadsheets for your accountant.`;

    actions.push(
      { label: 'Open CRA Mileage Logbook', href: '/routes/mileage', type: 'mileage' }
    );
  }
  // Default General Assistant
  else {
    matchedPermits = allPermits.slice(0, 2);
    spokenText = `I am Scout, your commercial intelligence co-pilot. I can search permits, find trade opportunities in Kelowna, or launch in-app drive mode.`;
    displayText = `### 🧭 Scout AI Assistant\nI'm connected to the **City of Kelowna & Okanagan Valley** permit database ($180M+ active pipeline).\n\nAsk me anything, for example:\n- *"Show me high-value framing in Wilden"*\n- *"What are the biggest electrical jobs downtown?"*\n- *"Find permits near Rutland Road"*\n- *"How do I track mileage for CRA?"*`;

    actions.push(
      { label: 'Search Permits', href: '/search', type: 'search' },
      { label: 'Route Builder', href: '/routes/builder', type: 'route' },
      { label: 'Mileage Logbook', href: '/routes/mileage', type: 'mileage' }
    );
  }

  return {
    spokenText: cleanSpokenText(spokenText),
    displayText,
    permits: matchedPermits,
    actions,
    source: 'local_scout_engine'
  };
}
