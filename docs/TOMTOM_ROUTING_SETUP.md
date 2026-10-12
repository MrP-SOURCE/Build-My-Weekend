# TomTom routing setup for BUILD MY WEEKEND

This is the first server-side routing milestone. It creates a Cloudflare Worker proxy so the TomTom key stays server-side. The endpoint calculates a real driving route for one origin/destination pair; it does **not yet** replace every Cape Town-based distance in the planner. Frontend integration follows after this Worker is deployed and tested.

## 1. TomTom API key

The account already has a TomTom key with Search API and Routing API access. Store it only as the encrypted Cloudflare Worker secret named `TOMTOM_API_KEY`. Do not put it in GitHub, frontend JavaScript, screenshots, or chat. Review the current [TomTom pricing page](https://docs.tomtom.com/pricing) and applicable terms before commercial launch.

## 2. Deploy routing code to the existing Cloudflare Worker

The Worker source is in `artifacts/routing-worker/`. The configuration deliberately targets the existing Worker named `go` at `https://go.build-my-weekend.workers.dev`, where the secret was added through the Cloudflare dashboard.

On Windows:

1. Install Node.js LTS from [nodejs.org](https://nodejs.org/) if it is not already installed.
2. Download or clone the latest repository source and open Command Prompt in the repository folder.
3. Run:

   ```bat
   cd artifacts\routing-worker
   npm install --global wrangler
   npx wrangler login
   npx wrangler deploy
   ```

4. Confirm Wrangler says it deployed Worker `go`. This updates the existing Worker rather than creating a second one.
5. The dashboard-added `TOMTOM_API_KEY` secret should remain attached to this Worker across code deployments. If the health check reports `routingConfigured:false`, open Cloudflare > Workers & Pages > `go` > Settings > Variables and Secrets and verify the Production secret exists. Never put the key in `wrangler.toml` or a source file.

Open [https://go.build-my-weekend.workers.dev/healthz](https://go.build-my-weekend.workers.dev/healthz). It should return JSON containing `"status":"ok"` and `"routingConfigured":true`.

Official Cloudflare secret instructions: https://developers.cloudflare.com/workers/configuration/secrets/

## 3. Browser origin and rate limiting

The default allowed browser origin is `https://mrp-source.github.io`. If the app is served from another domain, update `ALLOWED_ORIGIN` in `wrangler.toml` to the exact origin (scheme and hostname only), then redeploy.

The Worker now expects a Cloudflare Workers Rate Limiting binding named `ROUTE_RATE_LIMITER`. The supplied `wrangler.toml` configures a limit of 20 route requests per client IP per 60 seconds. The Worker deliberately returns HTTP 503 for route requests if this binding is missing or its limiter errors, rather than silently making unprotected paid API calls. Excess requests return HTTP 429.

Before deploying this code, configure the Rate Limiting binding for Worker `go` in Cloudflare Workers & Pages > `go` > Settings > Bindings, using the binding name `ROUTE_RATE_LIMITER` and a rate limit of 20 requests over 60 seconds keyed by the incoming client IP. If your dashboard presents the Workers Rate Limiting API as a binding type, use that binding and the same limit. Then deploy the updated Worker code and verify both a normal route and the 503/429 behaviour. Do not deploy the fail-closed code before configuring the binding, or route lookups will return 503.

CORS is a browser control, not authentication or quota protection. The per-IP limit is an abuse-reduction measure, not a hard billing cap: Cloudflare rate limits are approximate and may be applied locally. Set a usage alert or budget threshold in TomTom as an additional safeguard before public promotion.

## 4. Test a route

Run from Command Prompt:

```bat
curl -X POST "https://go.build-my-weekend.workers.dev/api/route" -H "Content-Type: application/json" -H "Origin: https://mrp-source.github.io" -d "{\\"origin\\":\\"Cape Town, South Africa\\",\\"destination\\":\\"Hermanus, Western Cape, South Africa\\"}"
```

A successful response includes `distanceKmOneWay`, `driveMinutesOneWay`, source and a traffic disclaimer. It does not guarantee current traffic, road closures, road quality, or site access.

## 5. Next integration step

After the route endpoint is deployed and tested, wire the frontend to this URL, add a departure-area field, and update distance, drive-time, navigation and fuel calculations together. Until those changes pass tests, the published app remains a Cape Town-origin pilot.
