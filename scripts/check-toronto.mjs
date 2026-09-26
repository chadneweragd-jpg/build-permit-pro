async function checkToronto() {
  const url = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=building-permits-active-permits';
  const res = await fetch(url);
  const data = await res.json();
  console.log('Toronto package success:', data.success);
  if (data.result && data.result.resources) {
    console.log('Resources:');
    for (const r of data.result.resources) {
      console.log(`- ${r.name} | id: ${r.id} | format: ${r.format} | datastore_active: ${r.datastore_active} | url: ${r.url}`);
    }
  }
}
checkToronto();
