# Development rules

## Architectural rules

1. The public API should be domain-oriented and stable.
2. The core should not depend on React.
3. The core should not depend directly on Canvas or WebGL.
4. Renderer implementations should depend on renderer contracts.
5. Rendering should receive prepared render frames or batches.
6. Hot paths should use flat data structures and avoid unnecessary allocations.
7. Plugins should interact through explicit contracts.
8. Workers should communicate through typed messages.

## Naming rules

Use charting domain names where they clarify intent:

- `Chart`
- `Pane`
- `Series`
- `TimeScale`
- `PriceScale`
- `Viewport`
- `Crosshair`
- `Indicator`
- `Drawing`
- `Renderer`
- `DataStore`

Use low-level names where performance matters:

- `Buffer`
- `Batch`
- `Frame`
- `IndexRange`
- `Float64Array`
- `Int32Array`

## Testing strategy

### Unit tests

Use unit tests for:

- Scale calculations.
- Range indexing.
- Data normalization.
- Aggregation.
- Indicator math.
- Event dispatching.

### Contract tests

Use contract tests for:

- Public chart API.
- Renderer ports.
- Plugin contracts.
- Data feed contracts.

### Visual tests

Use visual regression tests for:

- Candlestick rendering.
- Line rendering.
- Grid rendering.
- Price/time scale labels.
- Crosshair.
- Drawings.

## Initial implementation order

Recommended order:

1. Core types and public API contracts.
2. Chart creation and lifecycle.
3. Canvas layer manager.
4. Time scale and price scale.
5. Candle data adapter and buffer.
6. Basic candlestick renderer.
7. Crosshair layer.
8. Pan and zoom interaction.
9. Visual tests.
10. React wrapper.
11. Plugin contracts.
12. Indicators.
13. Drawing tools.
14. Worker-based calculations.
15. Optional WebGL backend.

## Non-goals for the first version

Do not implement these at the start:

- Full plugin marketplace.
- WebGL renderer.
- Complex drawing tools.
- Full TradingView parity.
- Server-side rendering.
- Real-time feed integrations.
- Persistence layer.

The first version should prove the chart engine, scale model, data path, and Canvas renderer.
