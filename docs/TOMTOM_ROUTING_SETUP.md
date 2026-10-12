# TomTom routing setup for BUILD MY WEEKEND

The planner now uses a Cloudflare Worker proxy so the TomTom key stays server-side. The published planner requests live routes for up to eight shortlisted Western Cape destinations. Destination costs, accommodation and activities remain estimates; the destination catalogue is not nationwide.

## 1. TomTom API key

The account already has a TomTom key with Search API and Routing API access. Store it only as the encrypted Cloudflare Worker secret named `TOMTOM_API_KEY`. Do not put it in GitHub, frontend JavaScript, screenshots, or chat. Review the current [TomTom pricing page](https://docs.tomtom.com/pricing) and applicable terms before commercial launch.

## 2. Deploy the protected Worker from GitHub Actions

The Worker source is in `artifacts/routing-worker/`. Its Wrangler configuration targets the existing Worker named `go` at `https://go.build-my-weekend.workers.dev`. The protected code fails closed if the rate-limiting binding is absent, so configure the GitHub deployment credentials before running the deployment workflow.

In the GitHub repository `MrP-SOURCE/Build-My-Weekend`:

1. Open **Settings → Secrets and variables → Actions**.
2. Add repository secret `CLOUDFLARE_API_TOKEN`. Create a Cloudflare API token with permission to edit/deploy Workers for this account. Do not paste the token into chat or commit it to the repository.
3. Add repository secret `CLOUDFLARE_ACCOUNT_ID` using the account ID shown in the Cloudflare dashboard.
4. Open **Actions → Deploy BUILD MY WEEKEND routing Worker → Run workflow**. Select the `main` branch and run it.
5. Wait for the workflow to complete successfully. It deploys the existing Worker `go` using the checked-in Wrangler configuration, including the rate limit binding.

The existing Production secret `TOMTOM_API_KEY` should remain attached to the Worker across code deployments. If the health check reports `routingConfigured:false`, open Cloudflare → Workers & Pages → `go` → Settings → Variables and Secrets and verify the Production secret exists. Never put the TomTom key in `wrangler.toml`, GitHub source, or chat.

Open [https://go.build-my-weekend.workers.dev/healthz](https://go.build-my-weekend.workers.dev/healthz). It should return JSON containing `"status":"ok"` and `"routingConfigured":true`.

Official Cloudflare secrets guidance: https://developers.cloudflare.com/workers/configuration/secrets/
Official Cloudflare rate-limit API guidance: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## 3. Browser origin and rate limiting

The default allowed browser origin is `https://mrp-source.github.io`. If the app is served from another domain, update `ALLOWED_ORIGIN` in `wrangler.toml` to the exact origin (scheme and hostname only), then redeploy.

The Worker now expects a Cloudflare Workers Rate Limiting binding named `ROUTE_RATE_LIMITER`. The supplied `wrangler.toml` configures a limit of 20 route requests per client IP per 60 seconds. The Worker deliberately returns HTTP 503 for route requests if this binding is missing or its limiter errors, rather than silently making unprotected paid API calls. Excess requests return HTTP 429.

Cloudflare's Workers Rate Limiting API binding is configured through Wrangler, not as a normal dashboard binding. Use the repository's manual GitHub Actions deployment workflow above to apply it. The limit is keyed by client IP, so people sharing a public IP may share the same limit.

CORS is a browser control, not authentication or quota protection. The per-IP limit is an abuse-reduction measure, not a hard billing cap: Cloudflare rate limits are approximate and may be applied locally. Set a usage alert or budget threshold in TomTom as an additional safeguard before public promotion.

## 4. Test a route

Run from Command Prompt:

```bat
curl -X POST "https://go.build-my-weekend.workers.dev/api/route" -H "Content-Type: application/json" -H "Origin: https://mrp-source.github.io" -d "{\\"origin\\":\\"Cape Town, South Africa\\",\\"destination\\":\\"Hermanus, Western Cape, South Africa\\"}"
```

A successful response includes `distanceKmOneWay`, `driveMinutesOneWay`, source and a traffic disclaimer. It does not guarantee current traffic, road closures, road quality, or site access.

## 5. Post-deployment verification

1. Open the health endpoint and confirm `routingConfigured:true`.
2. Open the published app and check that a shortlist shows `ROUTE CHECKED · TomTom Routing API` and the selected departure area.
3. Check the Worker logs for unexpected HTTP 429 or 503 responses.
4. Set usage monitoring/alerts in the TomTom developer account. Cloudflare's per-location rate limiter is approximate, not a hard billing cap.
5. Do not promote the app as a nationwide directory: destinations remain a Western Cape pilot, and trip costs/accommodation/activity details are estimates.
