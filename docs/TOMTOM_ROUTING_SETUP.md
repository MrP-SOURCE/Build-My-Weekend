# TomTom routing setup for BUILD MY WEEKEND

This is the first server-side routing milestone. It creates a Cloudflare Worker proxy so the TomTom key stays server-side. The endpoint calculates a real driving route for one origin/destination pair; it does **not yet** replace every Cape Town-based distance in the planner. Frontend integration follows after the Worker is deployed and its URL is known.

## 1. Create a TomTom key

1. Open the [TomTom Developer Portal](https://developer.tomtom.com/) and create/sign in to your account.
2. Create an application if prompted, then enable the Search API and Routing API.
3. Copy the API key. Treat it as a password: do not put it in GitHub, frontend JavaScript, screenshots, or this chat.
4. Review the current [TomTom pricing page](https://docs.tomtom.com/pricing) and applicable terms before commercial launch. Free allowances and API terms can change.

## 2. Deploy the Worker from the repository

The Worker source is in `artifacts/routing-worker/`.

On Windows:

1. Install Node.js LTS from [nodejs.org](https://nodejs.org/) if it is not already installed.
2. Download or clone the repository to your PC and open Command Prompt in the repository folder.
3. Run:

   ```bat
   cd artifacts\routing-worker
   npm install --global wrangler
   npx wrangler login
   npx wrangler deploy
   ```

4. Wrangler prints a deployed URL similar to `https://build-my-weekend-routing.YOUR-ACCOUNT.workers.dev`. Save that URL; the account subdomain is specific to your Cloudflare account.
5. Add the TomTom key as an encrypted Worker secret:

   ```bat
   npx wrangler secret put TOMTOM_API_KEY
   ```

   Paste the key only at the terminal prompt. Do not add it to `wrangler.toml` or a source file. Wrangler creates a new Worker deployment when the secret is set.
6. Open `https://YOUR-WORKER-URL/healthz`. It should return JSON containing `"status":"ok"` and `"routingConfigured":true`.

Official Cloudflare secret instructions: https://developers.cloudflare.com/workers/configuration/secrets/

## 3. Browser origin and abuse protection

The default allowed browser origin is `https://mrp-source.github.io`. If the app is served from another domain, update `ALLOWED_ORIGIN` in `wrangler.toml` to the exact origin (scheme and hostname only), then redeploy.

CORS is a browser control, not authentication or quota protection. Before opening this endpoint to public traffic, configure a Cloudflare rate-limiting rule for `/api/route` and set a usage alert in TomTom. A public browser app cannot keep a shared client token secret.

## 4. Test a route

Replace the URL with your Worker URL and run from Command Prompt:

```bat
curl -X POST "https://YOUR-WORKER-URL/api/route" -H "Content-Type: application/json" -H "Origin: https://mrp-source.github.io" -d "{\"origin\":\"Cape Town, South Africa\",\"destination\":\"Hermanus, Western Cape, South Africa\"}"
```

A successful response includes `distanceKmOneWay`, `driveMinutesOneWay`, source and a traffic disclaimer. It does not guarantee current traffic, road closures, road quality, or site access.

## 5. Next integration step

Once the Worker is deployed, share **only the Worker URL** in the BUILD MY WEEKEND chat. Do not share the TomTom API key. The next code change can then wire the frontend to this endpoint, add a departure-area field, and update distance, drive-time, navigation and fuel calculations together. Until those changes pass tests, the published app remains a Cape Town-origin pilot.
