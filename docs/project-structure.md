# Project structure

```txt
src/
  core/
    chart/
    pane/
    series/
    scales/
    viewport/
    events/

  data/
    buffers/
    adapters/
    indexing/
    aggregation/

  rendering/
    common/
    canvas/
    webgl/
    layers/
    renderers/

  interaction/
    pointer/
    gestures/
    keyboard/
    hit-testing/

  indicators/
    sma/
    ema/
    rsi/
    vwap/

  drawings/
    trend-line/
    rectangle/
    fibonacci/
    position-tool/

  plugins/
    registry/
    contracts/

  react/
  utils/
  workers/

docs/
  architecture.md
  project-structure.md
  performance-guidelines.md
  development-rules.md

tests/
  unit/
  visual/
  contracts/

examples/
  playground/

scripts/
```

## Folder responsibilities

### `src/core`

Domain-level charting concepts. This layer defines the language of the library.

Examples:

- Chart model.
- Pane model.
- Series model.
- Time scale.
- Price scale.
- Viewport state.
- Event contracts.

### `src/data`

Efficient data storage and preparation.

Examples:

- TypedArray buffers.
- Data adapters.
- Time indexing.
- Visible range lookup.
- Aggregation and resampling.

### `src/rendering`

Rendering infrastructure and renderer implementations.

Examples:

- Canvas renderer.
- WebGL renderer later.
- Layer manager.
- Candlestick renderer.
- Line renderer.
- Grid renderer.
- Crosshair renderer.

### `src/interaction`

Pointer, keyboard, wheel, gesture, hit-testing, and selection behavior.

This layer should convert browser events into chart commands.

### `src/indicators`

Built-in technical indicators.

Initial examples:

- SMA
- EMA
- RSI
- VWAP

### `src/drawings`

Drawing tools and annotations.

Initial examples:

- Trend line.
- Rectangle.
- Fibonacci retracement.
- Long/short position tool.

### `src/plugins`

Extension system contracts and registry.

Plugins should be isolated from internal mutable state.

### `src/react`

Thin React adapter.

React should mount/unmount the chart and pass options/data, but it should not render candles, series, scales, or crosshair.

### `src/workers`

Worker entry points for expensive calculations.

Potential use cases:

- Indicator calculation.
- Tick aggregation.
- Downsampling.
- Resampling.
- Heavy hit-test precomputation.

### `tests/unit`

Unit tests for deterministic logic.

### `tests/visual`

Visual regression tests, preferably with Playwright screenshots.

### `tests/contracts`

Contract tests for public APIs, renderer ports, and plugin interfaces.
