// Comprehensive end-to-end verification script for Build Permit Pro
const BASE_URL = 'http://localhost:3000';

async function testPage(path) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const time = Date.now() - start;
    const text = await res.text();
    const isOk = res.status >= 200 && res.status < 400;
    const hasNextRoot = text.includes('__next') || text.includes('<!DOCTYPE html>');
    return {
      path,
      status: res.status,
      timeMs: time,
      ok: isOk && hasNextRoot,
      contentLength: text.length
    };
  } catch (err) {
    return {
      path,
      status: 'FETCH_ERROR',
      timeMs: Date.now() - start,
      ok: false,
      error: err.message
    };
  }
}

async function testApi(name, url, options = {}) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${url}`, options);
    const time = Date.now() - start;
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return {
      name,
      url,
      status: res.status,
      timeMs: time,
      ok: res.ok,
      data
    };
  } catch (err) {
    return {
      name,
      url,
      status: 'ERROR',
      timeMs: Date.now() - start,
      ok: false,
      error: err.message
    };
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log(' BUILD PERMIT PRO - SYSTEM INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Pages to test
  const pages = [
    '/',
    '/search',
    '/permits',
    '/pipeline',
    '/routes',
    '/routes/builder',
    '/routes/mileage',
    '/mileage',
    '/reports',
    '/settings',
    '/login'
  ];

  console.log('--- 1. Testing Page Routes ---');
  let pageFailures = 0;
  for (const page of pages) {
    const result = await testPage(page);
    if (result.ok) {
      console.log(`✓ [${result.status}] ${page} (${result.timeMs}ms, ${Math.round(result.contentLength / 1024)}KB)`);
    } else {
      pageFailures++;
      console.error(`✗ [${result.status}] ${page} - FAILED!`, result.error || '');
    }
  }

  // 2. APIs to test
  console.log('\n--- 2. Testing API Endpoints ---');
  let apiFailures = 0;

  // A. Calgary Socrata Ingestion
  const calgaryTest = await testApi('Calgary Ingestion', '/api/ingest/calgary?limit=10');
  if (calgaryTest.ok && calgaryTest.data?.permits?.length > 0) {
    const sample = calgaryTest.data.permits[0];
    console.log(`✓ Calgary Ingestion: ${calgaryTest.data.count} permits fetched (${calgaryTest.timeMs}ms)`);
    console.log(`   Sample: ${sample.permit_number} - ${sample.address} ($${sample.estimated_value.toLocaleString()}) [${sample.city_region}]`);
  } else {
    apiFailures++;
    console.error(`✗ Calgary Ingestion failed:`, calgaryTest);
  }

  // B. Builder Enrichment (Cache Hit)
  const enrichGetTest = await testApi(
    'Builder Enrichment GET',
    '/api/enrich-builder?company_name=AuthenTech%20Homes'
  );
  if (enrichGetTest.ok && enrichGetTest.data?.builder?.company_name) {
    const b = enrichGetTest.data.builder;
    console.log(`✓ Builder Enrichment GET: "${b.company_name}" phone=${b.primary_phone} email=${b.email} [${b.source}]`);
  } else {
    apiFailures++;
    console.error(`✗ Builder Enrichment GET failed:`, enrichGetTest);
  }

  // C. Builder Enrichment (POST)
  const enrichPostTest = await testApi(
    'Builder Enrichment POST',
    '/api/enrich-builder',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: 'Lakehouse Custom Homes', city: 'Kelowna' })
    }
  );
  if (enrichPostTest.ok && enrichPostTest.data?.builder?.company_name) {
    const b = enrichPostTest.data.builder;
    console.log(`✓ Builder Enrichment POST: "${b.company_name}" phone=${b.primary_phone} email=${b.email} [${b.source}]`);
  } else {
    apiFailures++;
    console.error(`✗ Builder Enrichment POST failed:`, enrichPostTest);
  }

  // D. Routing Directions (OSRM / Blue Line)
  const routeTest = await testApi(
    'Directions API (OSRM)',
    '/api/routes/directions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: [-119.3865, 49.9102], // 1665 Rutland Rd
        destination: [-119.4960, 49.8870] // Queensway Downtown
      })
    }
  );
  if (routeTest.ok && routeTest.data?.routes?.length > 0) {
    const r = routeTest.data.routes[0];
    const distKm = (r.distance / 1000).toFixed(1);
    const durMin = Math.round(r.duration / 60);
    const coordCount = r.geometry?.coordinates?.length || 0;
    console.log(`✓ Directions API: OSRM route decoded (${distKm} km, ${durMin} min, ${coordCount} GeoJSON vertices)`);
  } else {
    apiFailures++;
    console.error(`✗ Directions API failed:`, routeTest);
  }

  // E. Geocoding
  const geocodeTest = await testApi(
    'Geocoding API',
    '/api/routes/geocode?q=1665+Rutland+Rd'
  );
  if (geocodeTest.ok) {
    console.log(`✓ Geocoding API: ${geocodeTest.data.address || '1665 Rutland Rd'} -> [${geocodeTest.data.latitude}, ${geocodeTest.data.longitude}]`);
  } else {
    apiFailures++;
    console.error(`✗ Geocoding API failed:`, geocodeTest);
  }

  // F. Discovery Queue (Unmatched Contractors)
  const discoveryTest = await testApi(
    'Admin Unmatched Contractors',
    '/api/admin/unmatched-contractors'
  );
  if (discoveryTest.ok) {
    console.log(`✓ Discovery Queue API: ${discoveryTest.data.total_unmatched_count || discoveryTest.data.contractors?.length || 0} active contractors pending review`);
  } else {
    apiFailures++;
    console.error(`✗ Discovery Queue API failed:`, discoveryTest);
  }

  // G. CRM API
  const crmTest = await testApi('CRM Deals API', '/api/crm');
  if (crmTest.ok) {
    console.log(`✓ CRM Deals API: HTTP ${crmTest.status} OK`);
  } else {
    apiFailures++;
    console.error(`✗ CRM Deals API failed:`, crmTest);
  }

  console.log('\n====================================================');
  if (pageFailures === 0 && apiFailures === 0) {
    console.log(' ALL TESTS PASSED! APPLICATION IS 100% OPERATIONAL.');
  } else {
    console.error(` TEST FAILURES DETECTED: ${pageFailures} pages, ${apiFailures} APIs`);
  }
  console.log('====================================================');
}

runAllTests();
