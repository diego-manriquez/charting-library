# Charting Engine

Base scaffold for a high-performance financial charting library inspired by TradingView-style charting.

This repository intentionally starts with structure and architecture documentation only. Implementation should be added incrementally, keeping the render path lean and performance-oriented.

## Core principles

- TypeScript-first public API.
- Canvas 2D as the initial rendering backend.
- Optional WebGL backend later for dense visualizations and heavy overlays.
- React should be a thin adapter, not part of the render path.
- DDD-inspired domain language for charting concepts.
- Data-oriented design for rendering, buffers, workers, and hot paths.
- Modular architecture with ports/adapters for renderers, plugins, and data feeds.

## Repository structure

See [`docs/project-structure.md`](docs/project-structure.md).

## Architecture

See [`docs/architecture.md`](docs/architecture.md).

## Performance guidelines

See [`docs/performance-guidelines.md`](docs/performance-guidelines.md).

## Development rules

See [`docs/development-rules.md`](docs/development-rules.md).
# charting-library
