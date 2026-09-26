import fetch from 'node-fetch';

async function probeAll() {
  console.log('========================================================================');
  console.log(' PROBING ALL 17 MUNICIPAL CANADIAN OPEN DATA ENDPOINTS');
  console.log('========================================================================\n');

  const candidates = [
    { city: 'kelowna', type: 'portal', url: 'https://www.kelowna.ca/homes-building/building-permits-inspections/approved-building-permits' },
    { city: 'vancouver', type: 'ods', url: 'https://opendata.vancouver.ca/api/records/1.0/search/?dataset=issued-building-permits&rows=1&refine.issueyear=2026' },
    { city: 'calgary', type: 'socrata', url: 'https://data.calgary.ca/resource/c2es-76ed.json?$where=issueddate>=\'2026-01-01\'&$select=count(*)' },
    { city: 'edmonton', type: 'socrata', url: 'https://data.edmonton.ca/resource/24uj-dj8v.json?$where=issue_date>=\'2026-01-01\'&$select=count(*)' },
    { city: 'winnipeg', type: 'socrata', url: 'https://data.winnipeg.ca/resource/it4w-cpf4.json?$where=issue_date>=\'2026-01-01\'&$select=count(*)' },
    { city: 'toronto', type: 'ckan', url: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=6d0229af-bc54-46de-9c2b-26759b01dd05&limit=1' },
    { city: 'hamilton', type: 'arcgis', url: 'https://data-spatialsolutions.opendata.arcgis.com/datasets/building-and-demolition-permits-2017-to-present/explore' },
    { city: 'surrey', type: 'ckan', url: 'https://data.surrey.ca/api/3/action/package_search?q=building+permits' },
    { city: 'burnaby', type: 'portal', url: 'https://data-burnaby.opendata.arcgis.com/datasets/building-permits' },
    { city: 'ottawa', type: 'ckan', url: 'https://open.ottawa.ca/api/3/action/package_search?q=permits' },
    { city: 'mississauga', type: 'arcgis', url: 'https://data.mississauga.ca/datasets/mississauga::building-permits/about' },
    { city: 'brampton', type: 'arcgis', url: 'https://geohub.brampton.ca/datasets/building-permits' },
    { city: 'markham', type: 'arcgis', url: 'https://data-markham.opendata.arcgis.com/' },
    { city: 'vaughan', type: 'arcgis', url: 'https://opendata.vaughan.ca/' },
    { city: 'richmond', type: 'ckan', url: 'https://data.richmond.ca/' },
    { city: 'coquitlam', type: 'arcgis', url: 'https://gis.coquitlam.ca/' },
    { city: 'kitchener-waterloo', type: 'arcgis', url: 'https://data.kitchener.ca/' }
  ];

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { timeout: 8000 });
      console.log(`[${c.city.padEnd(20)}] Status: ${res.status} | Content-Type: ${res.headers.get('content-type')}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const d = await res.json();
        if (d.result?.results) {
          console.log(`  -> Packages found: ${d.result.results.length} (e.g. ${d.result.results[0]?.title || d.result.results[0]?.name})`);
        } else if (d.result?.total) {
          console.log(`  -> Datastore total: ${d.result.total}`);
        } else if (d.nhits) {
          console.log(`  -> ODS nhits: ${d.nhits}`);
        } else if (Array.isArray(d)) {
          console.log(`  -> Socrata count:`, d[0]);
        }
      }
    } catch (e) {
      console.log(`[${c.city.padEnd(20)}] Failed: ${e.message}`);
    }
  }
}

probeAll();
