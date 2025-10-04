.PHONY: help dev-up dev-down install build test lint type-check clean

help:
	@echo "PolyNote Development Commands"
	@echo "============================="
	@echo "make install       - Install all dependencies"
	@echo "make dev-up        - Start development environment"
	@echo "make dev-down      - Stop development environment"
	@echo "make build         - Build all packages"
	@echo "make test          - Run all tests"
	@echo "make lint          - Lint code"
	@echo "make type-check    - Run TypeScript type checking"
	@echo "make clean         - Clean build artifacts"

install:
	npm install

dev-up:
	@echo "Starting PolyNote development environment..."
	npm run dev

dev-down:
	@echo "Stopping development environment..."
	pkill -f "npm run dev" || true

build:
	npm run build

test:
	npm test

lint:
	npm run lint

type-check:
	npm run type-check

clean:
	npm run clean
	rm -rf node_modules packages/*/node_modules apps/*/node_modules