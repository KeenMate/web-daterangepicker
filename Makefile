.PHONY: help setup dev build package publish publish-dry clean test lint

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

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
	@echo "Package created"
	@ls -lh *.tgz

publish-dry: build ## Publish to npm (dry run)
	@echo "Running publish dry-run..."
	npm publish --dry-run
	@echo "Dry-run complete - Review the output above"

publish: build ## Publish to npm
	@echo "WARNING: This will publish to npm registry"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r
	@echo "Publishing to npm..."
	npm publish
	@echo "Published successfully"

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules
	rm -f *.tgz
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

test: ## Run tests (if configured)
	@echo "Tests are not configured yet"
	@echo "Consider adding tests in the future"

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
	@echo "You can now install this in another project with:"
	@echo "npm install $(shell ls -t *.tgz | head -1)"

# Default target
.DEFAULT_GOAL := help
