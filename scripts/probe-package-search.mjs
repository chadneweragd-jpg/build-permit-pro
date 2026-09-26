async function testEndpoints() {
  // 1. Winnipeg
  try {
    const res = await fetch('https://data.winnipeg.ca/resource/it4w-cpf4.json?$limit=3');
    const json = await res.json();
    console.log('Winnipeg it4w-cpf4:', res.status, Array.isArray(json) ? json.length : json);
    if (Array.isArray(json) && json[0]) console.log('Sample Winnipeg keys:', Object.keys(json[0]));
  } catch (e) {
    console.log('Winnipeg error:', e.message);
  }

  // 2. Toronto CKAN datastore
  try {
    const res = await fetch('https://ckan.open.toronto.ca/api/3/action/datastore_search?resource_id=6d0229af-bc54-46de-9c2b-26759b01dd05&limit=3');
    const json = await res.json();
    console.log('Toronto CKAN:', res.status, json.success, json.result?.records?.length);
    if (json.result?.records?.[0]) console.log('Sample Toronto record:', json.result.records[0]);
  } catch (e) {
    console.log('Toronto error:', e.message);
  }

  // 3. Surrey CKAN search
  try {
    const res = await fetch('https://data.surrey.ca/api/3/action/package_search?q=building+permits');
    const json = await res.json();
    console.log('Surrey search:', res.status, json.success, json.result?.results?.map(r => ({ id: r.id, name: r.name, resources: r.resources.map(res => ({ id: res.id, name: res.name, format: res.format })) })));
  } catch (e) {
    console.log('Surrey error:', e.message);
  }

  // 4. Ottawa ArcGIS Hub
  try {
    const res = await fetch('https://open.ottawa.ca/api/feed/dcat-ap/2.0.1.json');
    console.log('Ottawa portal status:', res.status);
  } catch (e) {
    console.log('Ottawa error:', e.message);
  }
}

testEndpoints();
