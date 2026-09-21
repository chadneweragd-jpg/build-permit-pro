const https = require('https');

const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const projectRef = process.env.SUPABASE_PROJECT_REF || 'xqmdssiiexbqeyzmdeza';

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: path,
      method: method,
      headers: {
        'apikey': secretKey,
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data.substring(0, 300) });
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Testing /pg/query:', await testEndpoint('/pg/query', 'POST', { query: 'SELECT 1;' }));
  console.log('Testing /rest/v1/rpc:', await testEndpoint('/rest/v1/rpc', 'GET'));
}

run();
