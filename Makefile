# appointments-web — developer tasks.

.DEFAULT_GOAL := help

.PHONY: help setup dev build test lint fix typecheck ci-local clean

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

ci-local: lint typecheck test ## Run the full PR gate set locally

clean: ## Remove build artifacts and caches
	rm -rf dist coverage node_modules/.vite
