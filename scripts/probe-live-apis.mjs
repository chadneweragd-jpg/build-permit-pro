import { SocrataConnector } from '../src/lib/ingestion/connectors/base-socrata';
import { ArcGISConnector } from '../src/lib/ingestion/connectors/base-arcgis';
import { CKANConnector } from '../src/lib/ingestion/connectors/base-ckan';

console.log('========================================================================');
console.log(' PROBING LIVE CANADIAN MUNICIPAL OPEN DATA ENDPOINTS');
console.log('========================================================================\n');

const PROBES = [
  // 1. Socrata Endpoints
  {
    city: 'calgary',
    type: 'socrata',
    url: 'https://data.calgary.ca/resource/c2es-76ed.json?$limit=5&$order=issueddate%20DESC'
  },
  {
    city: 'edmonton',
    type: 'socrata',
    url: 'https://data.edmonton.ca/resource/24uj-dj8v.json?$limit=5&$order=issue_date%20DESC'
  },
  {
    city: 'winnipeg',
    type: 'socrata',
    url: 'https://data.winnipeg.ca/resource/2436-svh7.json?$limit=5&$order=issue_date%20DESC'
  },
  // 2. CKAN / OpenDataSoft Endpoints
  {
    city: 'vancouver',
    type: 'ods',
    url: 'https://opendata.vancouver.ca/api/records/1.0/search/?dataset=issued-building-permits&rows=5'
  },
  {
    city: 'surrey',
    type: 'ckan',
    url: 'https://data.surrey.ca/api/3/action/package_show?id=building-permits'
  },
  {
    city: 'toronto',
    type: 'ckan',
    url: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=building-permits-active-permits'
  },
  // 3. ArcGIS Endpoints
  {
    city: 'burnaby',
    type: 'arcgis',
    url: 'https://services2.arcgis.com/13ms9dnrhslkbc2G/arcgis/rest/services/Building_Permits/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=5&f=json'
  },
  {
    city: 'mississauga',
    type: 'arcgis',
    url: 'https://services6.arcgis.com/5xbGnM1n54ey0z20/arcgis/rest/services/Active_Building_Permits/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=5&f=json'
  },
  {
    city: 'brampton',
    type: 'arcgis',
    url: 'https://services.arcgis.com/152a55j9d8G5B4r7/arcgis/rest/services/Building_Permits/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=5&f=json'
  },
  {
    city: 'hamilton',
    type: 'arcgis',
    url: 'https://services1.arcgis.com/112j5s70h2b3c4d5/arcgis/rest/services/Building_Permits/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=5&f=json'
  },
  {
    city: 'ottawa',
    type: 'arcgis',
    url: 'https://services.arcgis.com/G600V1S8xS288N7n/arcgis/rest/services/Building_Permits_2026/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=5&f=json'
  }
];

async function runProbes() {
  for (const probe of PROBES) {
    try {
      const res = await fetch(probe.url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
      console.log(`[${probe.city.toUpperCase()}] Status: ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          console.log(`  -> Array returned (${json.length} items). Sample keys:`, Object.keys(json[0] || {}));
        } else if (json.records) {
          console.log(`  -> ODS records returned (${json.records.length} items). Sample:`, json.records[0]?.fields);
        } else if (json.result) {
          console.log(`  -> CKAN result:`, json.result.name || json.result.title || Object.keys(json.result));
        } else if (json.features) {
          console.log(`  -> ArcGIS features returned (${json.features.length} items). Sample:`, json.features[0]?.attributes);
        } else {
          console.log(`  -> Response keys:`, Object.keys(json));
        }
      } else {
        const txt = await res.text();
        console.log(`  -> HTTP Error:`, txt.slice(0, 100));
      }
    } catch (err) {
      console.log(`  -> Fetch failed:`, err.message);
    }
  }
}

runProbes();
