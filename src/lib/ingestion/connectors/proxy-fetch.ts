// SHARED UTILITY (2026-10-04): some city government websites sit behind Cloudflare (or a
// similar service) bot-protection that returns a JS-challenge "Attention Required" page to
// any plain server-side fetch, no matter how browser-like the request headers look --
// confirmed directly against kelowna.ca, which blocked a request carrying a completely
// normal Chrome User-Agent and a full set of real-browser headers. Getting past a challenge
// like that requires actually running the challenge's JavaScript in a real browser engine,
// which a plain fetch() can never do on its own.
//
// ZenRows (https://www.zenrows.com) is a paid scraping-proxy service built for exactly this:
// it runs a real headless browser on their end, solves the challenge, and hands back the
// final rendered page. This helper wraps that integration so ANY connector -- not just
// Kelowna's -- can swap a direct fetch() for one that can get through a Cloudflare wall,
// without re-implementing the integration each time. When Chad mentioned other cities will
// likely need this too, this is built as a shared, reusable piece for that reason.
//
// Needs a ZENROWS_API_KEY environment variable set in Vercel (Project Settings ->
// Environment Variables) to actually use the proxy. Without one, this quietly falls back to
// a normal direct fetch (with a realistic browser User-Agent) -- so the app still builds and
// runs fine for everyone who hasn't set this up, and a Cloudflare-blocked city just keeps
// honestly reporting "no live data", exactly like it does today, rather than crashing.
//
// Cost note: each request through the proxy with js_render+premium_proxy (needed for a
// Cloudflare-protected site) uses 25 of ZenRows' credits. Their free tier is 5,000
// credits/month, ongoing (not a trial) -- that's roughly 200 proxied page fetches/month at
// no cost, comfortably covering one city fetched once daily (~60 requests/month). Scaling to
// several more Cloudflare-protected cities may need their next tier up, which was $16/month
// for 45,000 credits/month as of this writing -- worth rechecking their pricing page if this
// gets used a lot, since pricing can change.

const ZENROWS_ENDPOINT = 'https://api.zenrows.com/v1/';

const BROWSER_LIKE_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
};

export interface ProxyFetchOptions {
  /** A CSS selector ZenRows should wait to see before returning the page, so it hands back
   *  content loaded past any JS challenge rather than an intermediate loading state. */
  waitForSelector?: string;
}

export async function fetchThroughProxy(targetUrl: string, options?: ProxyFetchOptions): Promise<Response> {
  const apiKey = process.env.ZENROWS_API_KEY;

  if (!apiKey) {
    // No proxy configured -- try the direct connection, same as before this existed. This
    // is what happens for every Cloudflare-protected city until a ZenRows account is set up
    // and its key added to Vercel.
    return fetch(targetUrl, { headers: BROWSER_LIKE_HEADERS });
  }

  const proxyUrl = new URL(ZENROWS_ENDPOINT);
  proxyUrl.searchParams.set('apikey', apiKey);
  proxyUrl.searchParams.set('url', targetUrl);
  proxyUrl.searchParams.set('js_render', 'true');
  proxyUrl.searchParams.set('premium_proxy', 'true');
  if (options?.waitForSelector) {
    proxyUrl.searchParams.set('wait_for', options.waitForSelector);
  }

  return fetch(proxyUrl.toString());
}
