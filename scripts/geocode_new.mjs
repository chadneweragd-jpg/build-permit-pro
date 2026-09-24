const addresses = [
  '1553 Olive Pond Pl, Kelowna, BC',
  '1090 Manhattan Dr, Kelowna, BC',
  '255 Lawrence Ave, Kelowna, BC',
  '1950 Harvey Ave, Kelowna, BC',
  '1961 Harvey Ave, Kelowna, BC',
  '2252 Woodlawn St, Kelowna, BC'
];

async function geocode() {
  for (const addr of addresses) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BuildPermitPro/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        console.log(`"${addr}": (${Number(data[0].lat)}, ${Number(data[0].lon)}),`);
      } else {
        console.log(`"${addr}": null,`);
      }
      await new Promise(r => setTimeout(r, 1100));
    } catch (err) {
      console.error(addr, err.message);
    }
  }
}

geocode();
