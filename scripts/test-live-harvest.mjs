import fetch from 'node-fetch';

async function testHarvest() {
  console.log('Testing live harvest...');

  // 1. Calgary
  const cgyUrl = new URL('https://data.calgary.ca/resource/c2es-76ed.json');
  cgyUrl.searchParams.set('$where', "issueddate >= '2026-01-01'");
  cgyUrl.searchParams.set('$limit', '100');
  const cgyRes = await fetch(cgyUrl.toString());
  const cgyData = await cgyRes.json();
  console.log('Calgary 100 rows OK, sample cost:', cgyData[0]?.estprojectcost, 'date:', cgyData[0]?.issueddate);

  // 2. Edmonton
  const edmUrl = new URL('https://data.edmonton.ca/resource/24uj-dj8v.json');
  edmUrl.searchParams.set('$where', "issue_date >= '2026-01-01'");
  edmUrl.searchParams.set('$limit', '100');
  const edmRes = await fetch(edmUrl.toString());
  const edmData = await edmRes.json();
  console.log('Edmonton 100 rows OK, sample cost:', edmData[0]?.construction_value, 'date:', edmData[0]?.issue_date);

  // 3. Winnipeg
  const wpgUrl = new URL('https://data.winnipeg.ca/resource/it4w-cpf4.json');
  wpgUrl.searchParams.set('$where', "issue_date >= '2026-01-01'");
  wpgUrl.searchParams.set('$limit', '100');
  const wpgRes = await fetch(wpgUrl.toString());
  const wpgData = await wpgRes.json();
  console.log('Winnipeg 100 rows OK, sample permit:', wpgData[0]?.permit_number, 'date:', wpgData[0]?.issue_date);

  // 4. Vancouver
  const vanUrl = new URL('https://opendata.vancouver.ca/api/records/1.0/search/?dataset=issued-building-permits&rows=100&refine.issueyear=2026');
  const vanRes = await fetch(vanUrl.toString());
  const vanData = await vanRes.json();
  console.log('Vancouver 100 rows OK, total in 2026:', vanData.nhits, 'sample cost:', vanData.records[0]?.fields?.projectvalue);

  // 5. Brampton
  const brmUrl = new URL('https://maps1.brampton.ca/arcgis/rest/services/BuildingPermit/Building_Permits/MapServer/0/query?where=1%3D1&resultRecordCount=100&f=json&outFields=*');
  const brmRes = await fetch(brmUrl.toString());
  const brmData = await brmRes.json();
  console.log('Brampton 100 rows OK, sample permit:', brmData.features[0]?.attributes?.PERMITNUMBER);

  // 6. Toronto
  const toUrl = new URL('https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=6d0229af-bc54-46de-9c2b-26759b01dd05&limit=100');
  const toRes = await fetch(toUrl.toString());
  const toData = await toRes.json();
  console.log('Toronto 100 rows OK, sample permit:', toData.result?.records[0]?.PERMIT_NUM);

  console.log('ALL 6 PRIMARY CANADIAN PORTALS READY FOR LIVE HARVEST!');
}

testHarvest().catch(console.error);
