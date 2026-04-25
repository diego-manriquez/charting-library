# Performance guidelines

## Core rule

Keep the render loop data-oriented.

Use DDD-inspired names and boundaries for architecture, but do not put rich domain objects in hot paths.

## Rendering strategy

Start with Canvas 2D.

Use WebGL only when there is a concrete need, such as:

- Extremely dense overlays.
- Heatmaps.
- Thousands of drawings.
- Heavy order book visualization.
- GPU-accelerated custom series.

## Layered canvas strategy

Prefer multiple canvas layers:

```txt
Canvas 1: grid/background
Canvas 2: series/candles/volume
Canvas 3: drawings/indicators
Canvas 4: crosshair/hover/selection
```

This allows cheap redraws for pointer movement and crosshair updates.

## Invalidation strategy

Do not render directly from every event.

Use an invalidation scheduler with `requestAnimationFrame`.

Example categories:

- `layout`
- `data`
- `scale`
- `series`
- `interaction`
- `crosshair`

Pointer movement should usually invalidate only the interaction/crosshair layer.

## Data storage

Accept user-friendly data in the public API, but convert internally to buffer-based storage.

Preferred internal format:

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

Benefits:

- Lower garbage collection pressure.
- Better memory locality.
- Faster range scans.
- Easier worker transfer.
- Better preparation for WebGL buffers.

## Visible range virtualization

Never draw the entire dataset when only a portion is visible.

Use index ranges:

```ts
const from = visibleRange.fromIndex;
const to = visibleRange.toIndex;
```

Avoid creating new arrays with `slice` in hot paths.

## Level of Detail

When there are more data points than pixels, aggregate visually.

Example:

```txt
100,000 candles visible
1,200 pixels wide
```

Rendering all candles individually is wasteful. Aggregate by pixel column or use min/max/open/close summaries.

## Batching

Batch drawing operations by style.

Avoid this pattern in hot paths:

```ts
for (const candle of candles) {
  ctx.beginPath();
  ctx.moveTo(...);
  ctx.lineTo(...);
  ctx.stroke();
}
```

Prefer batching:

```ts
ctx.beginPath();

for (const candle of greenCandles) {
  // add path operations
}

ctx.stroke();
```

## Workers

Use workers for expensive computations that do not need direct DOM access.

Good candidates:

- Indicator calculations.
- Tick-to-candle aggregation.
- Downsampling.
- Data normalization.
- Large hit-test maps.

## Avoid

- React rendering for candles or crosshair.
- SVG for large datasets.
- Object-heavy candle models in render loops.
- Recomputing scales on every pointer move.
- Full redraws when only crosshair changed.
- Allocating temporary arrays inside animation frames.
