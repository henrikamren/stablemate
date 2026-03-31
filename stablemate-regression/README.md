# StableMate regression suite

This is a Playwright regression suite for the uploaded `index.html` app. It is designed to catch breakage in the flows that matter most right now:

- app boot and splash routing
- session restore for saved users
- rider login
- parent child filtering in the booking sheet
- trainer availability defaults and warnings
- booking delete permissions
- booking deletion side effects
- sign-out behavior

## Why this setup

Your app is a single static HTML file with inline CSS/JS and a Supabase client loaded from a CDN. To make the suite deterministic, the tests:

- serve the app locally with Python's built-in HTTP server
- stub the Supabase CDN script in-browser
- replace real database calls with a test double backed by fixture data
- stub `confirm()` and `alert()` so destructive flows can be tested automatically

That gives you a fast regression harness without needing a live database.

## Run it

```bash
cd /mnt/data/stablemate-regression
npm install
npx playwright install
npm test
```

## Important limitation

This suite is strong for UI regressions and client-side logic, but it does **not** prove your production Supabase schema, RLS rules, or real network behavior are correct. You still need a second layer of integration tests against a real environment for that.
