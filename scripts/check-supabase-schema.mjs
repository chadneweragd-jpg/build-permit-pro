const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSwagger() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log('Tables:', Object.keys(data.definitions || {}));
  console.log('RPCs:', Object.keys(data.paths || {}).filter(p => p.startsWith('/rpc')));
}
checkSwagger();
