import { VerifiedBuilder } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { VERIFIED_BUILDERS, normalizeContractorName, calculateTrigramSimilarity } from '@/lib/builders-service';
import { isValidEmail, isValidPhoneNumber } from '@/lib/contact-utils';

export interface EnrichedBuilderProfile {
  company_name: string;
  normalized_name: string;
  primary_phone?: string;
  email?: string;
  website?: string;
  physical_address?: string;
  key_principal?: string;
  city?: string;
  province?: string;
  source: 'cache' | 'database' | 'places_scraper' | 'fallback';
  enriched_at: string;
}

// Runtime in-memory cache to guarantee zero duplicate queries during execution
const RUNTIME_ENRICHMENT_CACHE = new Map<string, EnrichedBuilderProfile>();

// Seed cache with our 102+ curated verified builders
for (const b of VERIFIED_BUILDERS) {
  RUNTIME_ENRICHMENT_CACHE.set(b.normalized_name, {
    company_name: b.company_name,
    normalized_name: b.normalized_name,
    primary_phone: b.primary_phone,
    email: b.email,
    website: b.website,
    physical_address: b.physical_address,
    key_principal: b.key_principal,
    city: b.city,
    province: b.province,
    source: 'cache',
    enriched_at: new Date().toISOString()
  });
}

/**
 * Common builder email prefixes ordered by trade estimation priority
 */
const EMAIL_PRIORITY_PATTERNS = [
  /^estimating@/i,
  /^estimates@/i,
  /^quotes@/i,
  /^bids@/i,
  /^tenders@/i,
  /^projects@/i,
  /^sales@/i,
  /^info@/i,
  /^contact@/i,
  /^admin@/i,
  /^office@/i
];

/**
 * Lightweight web scraper: extracts candidate emails from domain homepage and /contact
 */
async function scrapeDomainForEmails(websiteUrl: string): Promise<string | undefined> {
  if (!websiteUrl || !websiteUrl.startsWith('http')) return undefined;

  let domain: string;
  try {
    const parsed = new URL(websiteUrl);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }

  const urlsToTry = [
    websiteUrl,
    new URL('/contact', websiteUrl).toString(),
    new URL('/contact-us', websiteUrl).toString(),
    new URL('/about', websiteUrl).toString()
  ];

  const foundEmails = new Set<string>();
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BuildPermitPro-EnrichmentBot/1.0 (+https://buildpermitpro.ca)'
        },
        signal: AbortSignal.timeout(3500)
      });

      if (!res.ok) continue;

      const html = await res.text();
      const matches = html.match(emailRegex);
      if (matches) {
        for (const match of matches) {
          const lower = match.toLowerCase();
          // Filter out asset extensions, dummy placeholders, or analytics
          if (
            !lower.endsWith('.png') &&
            !lower.endsWith('.jpg') &&
            !lower.endsWith('.jpeg') &&
            !lower.endsWith('.webp') &&
            !lower.includes('sentry') &&
            !lower.includes('wixpress') &&
            !lower.includes('example.com') &&
            isValidEmail(lower)
          ) {
            foundEmails.add(lower);
          }
        }
      }
      if (foundEmails.size >= 3) break;
    } catch {
      // Ignore network timeouts on individual pages
    }
  }

  if (foundEmails.size === 0) return undefined;

  const emailList = Array.from(foundEmails);

  // Score candidate emails by priority (estimating > sales > info > other)
  for (const pattern of EMAIL_PRIORITY_PATTERNS) {
    const matched = emailList.find((e) => pattern.test(e));
    if (matched) return matched;
  }

  // Prefer email from the same domain
  const domainEmail = emailList.find((e) => e.endsWith(`@${domain}`));
  if (domainEmail) return domainEmail;

  return emailList[0];
}

/**
 * Step A: Google Places API or text lookup for business telephone, physical address, and website
 */
async function queryGooglePlaces(
  companyName: string,
  city: string
): Promise<{
  phone?: string;
  address?: string;
  website?: string;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const query = `${companyName} contractor ${city}`;
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&key=${apiKey}`;

      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const place = data.results[0];
          let website = place.website;
          let phone = place.formatted_phone_number;

          // If details missing, fetch place details
          if (place.place_id && (!website || !phone)) {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,international_phone_number,website,formatted_address&key=${apiKey}`;
            const detailRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(4000) });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.result) {
                website = website || detailData.result.website;
                phone = phone || detailData.result.formatted_phone_number || detailData.result.international_phone_number;
              }
            }
          }

          return {
            phone: isValidPhoneNumber(phone) ? phone : undefined,
            address: place.formatted_address,
            website
          };
        }
      }
    } catch (err) {
      console.warn('Google Places API query error:', err);
    }
  }

  // Graceful fallback for demo/dev without Places API billing
  return {};
}

/**
 * Master Two-Step Builder Enrichment Pipeline:
 * 1. Normalized Database / In-Memory Cache Lookup (0ms latency, $0 cost)
 * 2. Step A: Google Places business resolution
 * 3. Step B: Domain email scraping (/contact, /about)
 * 4. Cache Write-Back
 */
export async function enrichBuilderProfile(
  companyName: string,
  city: string = 'Kelowna'
): Promise<EnrichedBuilderProfile> {
  if (!companyName || !companyName.trim()) {
    throw new Error('Company name is required for enrichment');
  }

  const normalized = normalizeContractorName(companyName);

  const isCalgary = city.toLowerCase() === 'calgary';

  // 1. MASTER CACHE CHECK (In-Memory)
  if (RUNTIME_ENRICHMENT_CACHE.has(normalized)) {
    const cached = RUNTIME_ENRICHMENT_CACHE.get(normalized)!;
    const cachedCity = (cached.city || '').toLowerCase();
    const cachedProv = (cached.province || '').toUpperCase();
    const cityMatches = isCalgary
      ? (cachedProv === 'AB' || cachedCity === 'calgary')
      : (cachedProv === 'BC' || (cachedCity !== 'calgary' && cachedProv !== 'AB'));

    if (cityMatches) {
      if (isCalgary && cached.primary_phone?.includes('(250)')) {
        return { ...cached, primary_phone: undefined, physical_address: undefined };
      }
      return cached;
    }
  }

  // Check fuzzy similarity against cached builders (minimum similarity 0.90 & strict city constraint)
  for (const [key, cached] of RUNTIME_ENRICHMENT_CACHE.entries()) {
    const cachedCity = (cached.city || '').toLowerCase();
    const cachedProv = (cached.province || '').toUpperCase();
    const cityMatches = isCalgary
      ? (cachedProv === 'AB' || cachedCity === 'calgary')
      : (cachedProv === 'BC' || (cachedCity !== 'calgary' && cachedProv !== 'AB'));

    if (!cityMatches) continue;

    if (calculateTrigramSimilarity(key, normalized) >= 0.90) {
      if (isCalgary && cached.primary_phone?.includes('(250)')) {
        return { ...cached, primary_phone: undefined, physical_address: undefined, source: 'cache' };
      }
      return { ...cached, source: 'cache' };
    }
  }

  // 2. CHECK SUPABASE builders_directory OR contractors TABLE
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('builders_directory')
        .select('*')
        .or(`normalized_name.eq.${normalized},company_name.ilike.%${companyName.trim()}%`);

      if (isCalgary) {
        query = query.or('province.eq.AB,city.ilike.%calgary%');
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (!error && data) {
        const dProv = (data.province || '').toUpperCase();
        const dCity = (data.city || '').toLowerCase();
        const matchesCity = isCalgary
          ? (dProv === 'AB' || dCity === 'calgary')
          : (dProv === 'BC' || (dCity !== 'calgary' && dProv !== 'AB'));

        if (matchesCity) {
          const profile: EnrichedBuilderProfile = {
            company_name: data.company_name,
            normalized_name: data.normalized_name || normalized,
            primary_phone: isCalgary && data.primary_phone?.includes('(250)') ? undefined : data.primary_phone,
            email: data.email,
            website: data.website,
            physical_address: data.physical_address,
            key_principal: data.key_principal,
            city: data.city || city,
            province: data.province || (isCalgary ? 'AB' : 'BC'),
            source: 'database',
            enriched_at: data.updated_at || new Date().toISOString()
          };
          RUNTIME_ENRICHMENT_CACHE.set(normalized, profile);
          return profile;
        }
      }
    } catch (err) {
      console.warn('Supabase builder cache check error:', err);
    }
  }

  // 3. STEP A: GOOGLE PLACES API RESOLUTION
  const placesData = await queryGooglePlaces(companyName, city);

  // Strip contaminated (250) phone numbers if searching in Calgary
  if (isCalgary && (placesData.phone?.includes('(250)') || placesData.phone?.startsWith('250'))) {
    placesData.phone = undefined;
  }

  // 4. STEP B: LIGHTWEIGHT DOMAIN EMAIL SCRAPER
  let scrapedEmail: string | undefined;
  if (placesData.website) {
    scrapedEmail = await scrapeDomainForEmails(placesData.website);
  }

  const enrichedProfile: EnrichedBuilderProfile = {
    company_name: companyName.trim(),
    normalized_name: normalized,
    primary_phone: placesData.phone,
    website: placesData.website,
    physical_address: placesData.address,
    email: scrapedEmail,
    city,
    province: city.toLowerCase() === 'calgary' ? 'AB' : 'BC',
    source: placesData.phone || placesData.website ? 'places_scraper' : 'fallback',
    enriched_at: new Date().toISOString()
  };

  // 5. CACHE WRITE-BACK (In-Memory + Supabase)
  RUNTIME_ENRICHMENT_CACHE.set(normalized, enrichedProfile);

  if (isSupabaseConfigured && supabase && (enrichedProfile.primary_phone || enrichedProfile.website || enrichedProfile.email)) {
    try {
      await supabase.from('builders_directory').upsert(
        {
          company_name: enrichedProfile.company_name,
          normalized_name: enrichedProfile.normalized_name,
          primary_phone: enrichedProfile.primary_phone,
          email: enrichedProfile.email,
          website: enrichedProfile.website,
          physical_address: enrichedProfile.physical_address,
          city: enrichedProfile.city,
          province: enrichedProfile.province,
          category: 'Commercial & Residential Builder',
          association: city.toLowerCase() === 'calgary' ? 'CHBA-Calgary' : 'CHBA-CO',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'normalized_name' }
      );
    } catch (dbErr) {
      console.warn('Supabase cache write-back error:', dbErr);
    }
  }

  return enrichedProfile;
}
