# appointments-web — developer tasks.

.DEFAULT_GOAL := help

.PHONY: help setup dev build test lint fix typecheck ci-local clean \
	generate-client vendor-contract check-client storybook build-storybook \
	setup-e2e e2e e2e-a11y e2e-visual e2e-update-snapshots bundle-check lighthouse

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

clean: ## Remove build artifacts and caches
	rm -rf dist dist-e2e coverage storybook-static playwright-report test-results \
		lighthouse-report .lighthouseci node_modules/.vite
