.PHONY: help setup dev build package publish publish-rc publish-dry clean test test-e2e test-e2e-ui test-e2e-headed test-e2e-install lint

# Use bash-compatible commands for Git Bash on Windows
SHELL := /bin/bash

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: ## Install dependencies and prepare project
	@echo "Installing dependencies..."
	npm install
	@echo "Setup complete"

dev: ## Start development server with hot reload
	@echo "Starting development server..."
	npm run dev

build: ## Build for production
	@echo "Building for production..."
	npm run build
	@echo "Build complete - Files in ./dist"

package: build ## Create npm package (tarball)
	@echo "Creating package..."
	npm pack
	@echo "Package created successfully"

publish-dry: build ## Publish to npm (dry run)
	@echo "Running publish dry-run..."
	npm publish --dry-run
	@echo "Dry-run complete - Review the output above"

publish: clean-dist build ## Publish to npm (latest tag)
	@echo "WARNING: This will publish to npm registry as 'latest'"
	@echo "Press Enter to continue (Ctrl+C to cancel)..."
	@read -r
	@echo "Publishing to npm..."
	npm publish
	@echo "Published successfully"

publish-rc: clean-dist build ## Publish to npm under the 'rc' dist-tag (keeps 'latest' untouched)
	@echo "WARNING: This will publish to npm registry under the 'rc' dist-tag"
	@echo "(consumers running 'npm install' will NOT pick this up; they opt in via @rc)"
	@echo "Press Enter to continue (Ctrl+C to cancel)..."
	@read -r
	@echo "Publishing to npm with --tag rc..."
	npm publish --tag rc
	@echo "Published successfully under the 'rc' dist-tag"

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning build artifacts..."
	rm -rf dist node_modules *.tgz
	@echo "Clean complete"

clean-dist: ## Clean only dist folder
	@echo "Cleaning dist folder..."
	rm -rf dist
	@echo "Dist cleaned"

preview: build ## Preview production build
	@echo "Starting preview server..."
	npm run preview

lint: ## Run linter (if configured)
	@echo "Linting is not configured yet"
	@echo "Consider adding ESLint in the future"

test: test-e2e ## Run the test suite (alias for test-e2e)

test-e2e: ## Run Playwright e2e tests (headless)
	@echo "Running e2e tests..."
	npm run test:e2e

test-e2e-ui: ## Run Playwright e2e tests in interactive UI mode
	npm run test:e2e:ui

test-e2e-headed: ## Run Playwright e2e tests headed (watch the browser)
	npm run test:e2e:headed

test-e2e-install: ## One-time: install the chromium browser binary for Playwright
	npm run test:e2e:install

check-version: ## Show current package version
	@echo "Current version:"
	@node -p "require('./package.json').version"

update-deps: ## Update dependencies
	@echo "Updating dependencies..."
	npm update
	@echo "Dependencies updated"

install-dev: ## Install as local dev dependency (for testing)
	@echo "Installing package locally..."
	npm pack
	@echo "Package created - Look for keenmate-web-daterangepicker-*.tgz file"
	@echo "Install in another project with: npm install <path-to-tgz>"

# Default target
.DEFAULT_GOAL := help
