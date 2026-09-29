# appointments-web — developer tasks.

.DEFAULT_GOAL := help

.PHONY: help setup dev build test lint fix typecheck ci-local clean \
	generate-client vendor-contract check-client storybook build-storybook \
	setup-e2e e2e e2e-a11y e2e-visual e2e-update-snapshots bundle-check lighthouse \
	compose-e2e-up compose-e2e-down seed-e2e e2e-composed e2e-composed-all

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies (npm ci if a lockfile exists, else npm install)
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi

dev: ## Start the Vite dev server
	npm run dev

build: ## Production build (type-checks first)
	npm run build

test: ## Run tests with coverage
	npm run test:coverage

lint: ## Lint and check formatting
	npm run lint
	npm run format:check

fix: ## Auto-fix lint issues and format
	npm run lint -- --fix
	npm run format

typecheck: ## Type check without emitting
	npm run typecheck

generate-client: ## Regenerate the typed API client from contracts/openapi.json
	npm run generate:client

vendor-contract: ## Copy the API's openapi.json here and regenerate the client
	npm run vendor:contract

check-client: ## Drift gate: fail if the committed client is stale vs the contract
	npm run check:client

storybook: ## Run the Storybook component workshop
	npm run storybook

build-storybook: ## Build the static Storybook site
	npm run build:storybook

ci-local: lint typecheck test check-client ## Run the full PR gate set locally

# ---- Browser test tiers (milestone 14) ---------------------------------------------------------
# These need the Playwright Chromium browser. On a corporate network see docs/BROWSER_TESTING.md:
# the download needs NODE_EXTRA_CA_CERTS and Chromium needs a few system libs.

setup-e2e: ## Install the Playwright Chromium browser (add --with-deps in CI for system libs)
	npx playwright install chromium

e2e: ## Playwright E2E journeys + a11y + visual (Chromium; builds the MSW app and previews it)
	npm run e2e

e2e-a11y: ## axe accessibility sweep — every route, light + dark, zero serious/critical
	npm run e2e:a11y

e2e-visual: ## Visual regression — key pages, light + dark
	npm run e2e:visual

e2e-update-snapshots: ## Regenerate the committed visual baselines
	npm run e2e:update-snapshots

bundle-check: build ## Enforce the gzipped bundle-size budget on the production build
	npm run bundle:check

lighthouse: build ## Run Lighthouse budgets (LCP/CLS/TBT) against the production build
	npm run lighthouse

# ---- Composed-stack E2E (milestone 15) ---------------------------------------------------------
# Run the Playwright *journeys* against the real API + Postgres + Redis behind the web tier, instead
# of the MSW preview. Needs Docker. The API image is built from the sibling repo first.

API_DIR ?= ../appointments-api

compose-e2e-up: ## Build the API + web images and bring the composed stack up (waits for health)
	docker build -t appointments-api:local $(API_DIR)
	docker compose -f docker-compose.e2e.yml up -d --build --wait

seed-e2e: ## Provision the aligned demo graph over the real API (idempotent)
	node scripts/seed-e2e.mjs

e2e-composed: ## Run the journeys against an already-running composed stack
	npm run e2e:composed

e2e-composed-all: compose-e2e-up seed-e2e ## Bring up the stack, seed it, run the journeys, tear down
	npm run e2e:composed; status=$$?; $(MAKE) compose-e2e-down; exit $$status

compose-e2e-down: ## Stop the composed stack and remove its volumes
	docker compose -f docker-compose.e2e.yml down -v

clean: ## Remove build artifacts and caches
	rm -rf dist dist-e2e coverage storybook-static playwright-report playwright-report-composed \
		test-results lighthouse-report .lighthouseci node_modules/.vite
