# Architecture

## Recommended architecture

The project should use a hybrid architecture:

```txt
Modular architecture
+ lightweight DDD for charting concepts
+ ports and adapters for renderers, plugins, and data feeds
+ data-oriented design for rendering and market data processing
```

The main goal is to keep the public API expressive and maintainable while keeping the render path fast and low-overhead.

## Why not pure DDD?

A charting library has two different natures:

1. A charting/financial domain with concepts such as `Chart`, `Pane`, `Series`, `TimeScale`, `PriceScale`, `Indicator`, `Drawing`, `Viewport`, and `ReplaySession`.
2. A graphics/data engine where performance depends on flat data, indexing, batching, caching, and low garbage collection pressure.

Pure DDD can be useful for modeling the product, but it should not leak into hot rendering paths.

Avoid rich domain objects in loops that process thousands or millions of candles.

Prefer this internally for rendering/data processing:

```ts
interface CandleBuffer {
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
}
```

Avoid this in hot paths:

```ts
class Candle {
  constructor(
    private open: Price,
    private high: Price,
    private low: Price,
    private close: Price,
    private time: Timestamp
  ) {}
}
```

## Layer overview

```txt
Public API
  -> Application / Controllers
  -> Domain Model
  -> Data Layer
  -> Rendering Layer
  -> Browser / Canvas / WebGL
```

## Public API layer

This layer is consumed by users of the library.

Expected API style:

```ts
const chart = createChart(container, options);

const candles = chart.addSeries("candlestick", {
  upColor: "#26a69a",
  downColor: "#ef5350",
});

candles.setData(data);
chart.timeScale().fitContent();
```

Rules:

- Stable API.
- Domain-oriented naming.
- No rendering implementation details exposed.
- Framework-agnostic.

## Application / controller layer

Coordinates user actions and internal state transitions.

Potential controllers:

- `ChartController`
- `SeriesController`
- `InteractionController`
- `ReplayController`
- `PluginController`

Responsibilities:

- Add/remove series.
- Update data.
- Change visible range.
- Apply zoom and pan.
- Coordinate panes.
- Dispatch render invalidations.
- Emit public events.

## Domain model layer

Contains charting concepts without depending on Canvas, WebGL, React, or DOM APIs.

Potential models:

- `ChartModel`
- `PaneModel`
- `SeriesModel`
- `TimeScaleModel`
- `PriceScaleModel`
- `ViewportModel`
- `DrawingModel`
- `IndicatorModel`

Guidelines:

- Keep models simple.
- Prefer plain interfaces and explicit state.
- Avoid object-heavy structures in high-frequency paths.

## Data layer

Stores and transforms market data efficiently.

Responsibilities:

- Convert public data objects into internal buffers.
- Maintain time indexes.
- Support incremental updates.
- Aggregate ticks into candles.
- Return visible ranges without unnecessary copying.
- Prepare data for rendering.

Potential modules:

- `CandleBuffer`
- `TickBuffer`
- `DataStore`
- `VisibleRangeIndex`
- `DataAdapter`
- `AggregationEngine`

## Rendering layer

The renderer should receive prepared render frames or render batches, not domain objects directly.

Preferred direction:

```ts
interface RendererPort {
  resize(size: Size): void;
  render(frame: RenderFrame): void;
  dispose(): void;
}
```

Possible implementations:

- `CanvasRenderer`
- `WebGLRenderer`
- `HeadlessRenderer`

Rules:

- Canvas 2D is the initial default renderer.
- WebGL should be optional and introduced only when needed.
- Rendering should use layers.
- Crosshair and pointer interactions should not force a full chart redraw.

## Interaction layer

Translates browser events into chart commands.

Modules:

- `PointerController`
- `GestureController`
- `KeyboardController`
- `HitTestEngine`
- `SelectionManager`
- `CrosshairController`

Examples:

```txt
pointermove -> update crosshair
wheel -> zoom time scale
drag -> pan viewport
click -> select drawing
```

## Plugin layer

The plugin system should be designed early, even if the first version exposes only limited extension points.

Potential plugin types:

- `SeriesPlugin`
- `IndicatorPlugin`
- `DrawingToolPlugin`
- `RendererPlugin`
- `DataFeedPlugin`

Rules:

- Plugins should use stable contracts.
- Plugins should not mutate internal state directly.
- Plugin rendering should be isolated through controlled renderer APIs.
