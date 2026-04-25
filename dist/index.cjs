"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createChart: () => createChart
});
module.exports = __toCommonJS(index_exports);

// src/core/chart/chart-options.ts
function resolveChartOptions(options) {
  return {
    width: options?.width,
    height: options?.height,
    backgroundColor: options?.backgroundColor ?? "#0b1220",
    textColor: options?.textColor ?? "#cbd5e1",
    padding: {
      top: options?.padding?.top ?? 16,
      right: options?.padding?.right ?? 16,
      bottom: options?.padding?.bottom ?? 24,
      left: options?.padding?.left ?? 16
    },
    grid: {
      visible: options?.grid?.visible ?? true,
      color: options?.grid?.color ?? "rgba(148, 163, 184, 0.18)",
      horizontalLines: options?.grid?.horizontalLines ?? 5,
      verticalLines: options?.grid?.verticalLines ?? 6
    }
  };
}

// src/core/scales/price-scale.ts
var DEFAULT_PRICE_RANGE = {
  min: 0,
  max: 1
};
var PriceScaleModel = class {
  getVisiblePriceRange(buffers, visibleRange) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const buffer of buffers) {
      if (buffer.length === 0) {
        continue;
      }
      const from = Math.max(0, Math.min(visibleRange.from, buffer.length - 1));
      const to = Math.max(from, Math.min(visibleRange.to, buffer.length - 1));
      for (let index = from; index <= to; index += 1) {
        min = Math.min(min, buffer.low[index] ?? min);
        max = Math.max(max, buffer.high[index] ?? max);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return DEFAULT_PRICE_RANGE;
    }
    if (min === max) {
      const padding2 = min === 0 ? 1 : Math.abs(min) * 0.01;
      return {
        min: min - padding2,
        max: max + padding2
      };
    }
    const delta = max - min;
    const padding = delta * 0.1;
    return {
      min: min - padding,
      max: max + padding
    };
  }
};

// src/core/scales/time-scale.ts
var TimeScaleModel = class {
  visibleRange = { from: 0, to: 0 };
  fitContent(length) {
    if (length <= 0) {
      this.visibleRange = { from: 0, to: 0 };
      return;
    }
    this.visibleRange = { from: 0, to: length - 1 };
  }
  getVisibleRange(length) {
    if (length <= 0) {
      return { from: 0, to: 0 };
    }
    const maxIndex = length - 1;
    const from = Math.max(0, Math.min(this.visibleRange.from, maxIndex));
    const to = Math.max(from, Math.min(this.visibleRange.to, maxIndex));
    return { from, to };
  }
};

// src/rendering/canvas/canvas-layer-manager.ts
var CanvasLayerManager = class {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.container.append(this.canvas);
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }
    this.context = context;
  }
  container;
  canvas;
  context;
  pixelRatio = 1;
  resize(size) {
    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(size.width * this.pixelRatio));
    this.canvas.height = Math.max(
      1,
      Math.floor(size.height * this.pixelRatio)
    );
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }
  getContext() {
    return this.context;
  }
  clear() {
    this.context.clearRect(
      0,
      0,
      this.canvas.width / this.pixelRatio,
      this.canvas.height / this.pixelRatio
    );
  }
  dispose() {
    this.canvas.remove();
  }
};

// src/rendering/common/geometry.ts
function getPlotArea(size, padding) {
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, size.width - padding.left - padding.right),
    height: Math.max(0, size.height - padding.top - padding.bottom)
  };
}

// src/rendering/renderers/candlestick-renderer.ts
var DEFAULT_SERIES_OPTIONS = {
  upColor: "#22c55e",
  downColor: "#ef4444",
  wickUpColor: "#22c55e",
  wickDownColor: "#ef4444",
  bodySpacingRatio: 0.72
};
function resolveSeriesOptions(options) {
  return {
    upColor: options?.upColor ?? DEFAULT_SERIES_OPTIONS.upColor,
    downColor: options?.downColor ?? DEFAULT_SERIES_OPTIONS.downColor,
    wickUpColor: options?.wickUpColor ?? DEFAULT_SERIES_OPTIONS.wickUpColor,
    wickDownColor: options?.wickDownColor ?? DEFAULT_SERIES_OPTIONS.wickDownColor,
    bodySpacingRatio: options?.bodySpacingRatio ?? DEFAULT_SERIES_OPTIONS.bodySpacingRatio
  };
}
function renderCandlesticks(params) {
  const { context, buffer, options, visibleRange, priceRange, plotArea } = params;
  if (buffer.length === 0 || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const candleSpacing = plotArea.width / visibleCount;
  const candleWidth = Math.max(
    1,
    Math.min(16, candleSpacing * options.bodySpacingRatio)
  );
  for (let index = visibleRange.from; index <= visibleRange.to; index += 1) {
    const open = getBufferValue(buffer.open, index);
    const high = getBufferValue(buffer.high, index);
    const low = getBufferValue(buffer.low, index);
    const close = getBufferValue(buffer.close, index);
    const isUp = close >= open;
    const x = plotArea.x + (index - visibleRange.from + 0.5) * candleSpacing;
    const highY = priceToY(high, priceRange, plotArea);
    const lowY = priceToY(low, priceRange, plotArea);
    const openY = priceToY(open, priceRange, plotArea);
    const closeY = priceToY(close, priceRange, plotArea);
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY));
    context.strokeStyle = isUp ? options.wickUpColor : options.wickDownColor;
    context.beginPath();
    context.moveTo(x, highY);
    context.lineTo(x, lowY);
    context.stroke();
    context.fillStyle = isUp ? options.upColor : options.downColor;
    context.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  }
}
function priceToY(price, range, plotArea) {
  const ratio = (price - range.min) / (range.max - range.min);
  return plotArea.y + plotArea.height - ratio * plotArea.height;
}
function getBufferValue(buffer, index) {
  const value = buffer[index];
  if (value === void 0) {
    throw new Error(`Missing buffer value at index ${index}.`);
  }
  return value;
}

// src/data/adapters/candle-data-adapter.ts
function createCandleBuffer(data) {
  const length = data.length;
  const time = new Float64Array(length);
  const open = new Float64Array(length);
  const high = new Float64Array(length);
  const low = new Float64Array(length);
  const close = new Float64Array(length);
  const volume = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    const candle = data[index];
    if (!candle) {
      throw new Error(`Missing candle at index ${index}.`);
    }
    const timestamp = candle.time instanceof Date ? candle.time.getTime() : candle.time;
    validateCandle(candle, index, timestamp);
    time[index] = timestamp;
    open[index] = candle.open;
    high[index] = candle.high;
    low[index] = candle.low;
    close[index] = candle.close;
    volume[index] = candle.volume ?? 0;
  }
  return {
    time,
    open,
    high,
    low,
    close,
    volume,
    length
  };
}
function validateCandle(candle, index, timestamp) {
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid candle time at index ${index}.`);
  }
  if (!Number.isFinite(candle.open) || !Number.isFinite(candle.high) || !Number.isFinite(candle.low) || !Number.isFinite(candle.close)) {
    throw new Error(`Invalid candle values at index ${index}.`);
  }
  if (candle.high < candle.low) {
    throw new Error(`Candle high must be >= low at index ${index}.`);
  }
}

// src/core/chart/chart-model.ts
var ChartModel = class {
  constructor(container, options) {
    this.container = container;
    this.options = resolveChartOptions(options);
    this.layerManager = new CanvasLayerManager(container);
    this.size = this.resolveInitialSize();
    this.applyContainerStyles();
    this.layerManager.resize(this.size);
    this.render();
  }
  container;
  options;
  timeScaleModel = new TimeScaleModel();
  priceScaleModel = new PriceScaleModel();
  layerManager;
  series = /* @__PURE__ */ new Map();
  nextSeriesId = 1;
  size;
  addCandlestickSeries(options) {
    const id = this.nextSeriesId;
    this.nextSeriesId += 1;
    this.series.set(id, {
      id,
      options: resolveSeriesOptions(options),
      buffer: createCandleBuffer([])
    });
    this.render();
    return id;
  }
  removeSeries(seriesId) {
    this.series.delete(seriesId);
    this.fitContent();
    this.render();
  }
  setSeriesData(seriesId, data) {
    const series = this.series.get(seriesId);
    if (!series) {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    series.buffer = createCandleBuffer(data);
    this.fitContent();
    this.render();
  }
  fitContent() {
    const maxLength = this.getMaxSeriesLength();
    this.timeScaleModel.fitContent(maxLength);
  }
  resize(width, height) {
    this.size = {
      width: Math.max(1, width),
      height: Math.max(1, height)
    };
    this.layerManager.resize(this.size);
    this.render();
  }
  render() {
    const context = this.layerManager.getContext();
    const plotArea = getPlotArea(this.size, this.options.padding);
    this.layerManager.clear();
    drawBackground(context, this.size, this.options.backgroundColor);
    drawGrid(context, plotArea, this.options);
    const buffers = Array.from(this.series.values(), (series) => series.buffer);
    const maxLength = this.getMaxSeriesLength();
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const priceRange = this.priceScaleModel.getVisiblePriceRange(
      buffers,
      visibleRange
    );
    for (const series of this.series.values()) {
      renderCandlesticks({
        context,
        buffer: series.buffer,
        options: series.options,
        visibleRange,
        priceRange,
        plotArea
      });
    }
  }
  dispose() {
    this.series.clear();
    this.layerManager.dispose();
  }
  resolveInitialSize() {
    return {
      width: Math.max(
        1,
        this.options.width ?? this.container.clientWidth ?? 0
      ),
      height: Math.max(
        1,
        this.options.height ?? this.container.clientHeight ?? 0
      )
    };
  }
  getMaxSeriesLength() {
    let maxLength = 0;
    for (const series of this.series.values()) {
      maxLength = Math.max(maxLength, series.buffer.length);
    }
    return maxLength;
  }
  applyContainerStyles() {
    if (!this.container.style.position) {
      this.container.style.position = "relative";
    }
  }
};
function drawBackground(context, size, color) {
  context.fillStyle = color;
  context.fillRect(0, 0, size.width, size.height);
}
function drawGrid(context, plotArea, options) {
  if (!options.grid.visible || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }
  context.strokeStyle = options.grid.color;
  context.lineWidth = 1;
  const horizontalStep = plotArea.height / options.grid.horizontalLines;
  const verticalStep = plotArea.width / options.grid.verticalLines;
  for (let index = 0; index <= options.grid.horizontalLines; index += 1) {
    const y = plotArea.y + index * horizontalStep;
    context.beginPath();
    context.moveTo(plotArea.x, y);
    context.lineTo(plotArea.x + plotArea.width, y);
    context.stroke();
  }
  for (let index = 0; index <= options.grid.verticalLines; index += 1) {
    const x = plotArea.x + index * verticalStep;
    context.beginPath();
    context.moveTo(x, plotArea.y);
    context.lineTo(x, plotArea.y + plotArea.height);
    context.stroke();
  }
}

// src/public-api/create-chart.ts
var CandlestickSeriesApiImpl = class {
  constructor(chartModel, seriesId) {
    this.chartModel = chartModel;
    this.seriesId = seriesId;
  }
  chartModel;
  seriesId;
  setData(data) {
    this.chartModel.setSeriesData(this.seriesId, data);
  }
};
var TimeScaleApiImpl = class {
  constructor(chartModel) {
    this.chartModel = chartModel;
  }
  chartModel;
  fitContent() {
    this.chartModel.fitContent();
    this.chartModel.render();
  }
};
var ChartApiImpl = class {
  constructor(chartModel) {
    this.chartModel = chartModel;
    this.timeScaleApi = new TimeScaleApiImpl(chartModel);
  }
  chartModel;
  timeScaleApi;
  seriesApiIds = /* @__PURE__ */ new WeakMap();
  addSeries(type, options) {
    if (type !== "candlestick") {
      throw new Error(`Unsupported series type: ${type}.`);
    }
    const seriesId = this.chartModel.addCandlestickSeries(options);
    const api = new CandlestickSeriesApiImpl(this.chartModel, seriesId);
    this.seriesApiIds.set(api, seriesId);
    return api;
  }
  removeSeries(series) {
    const seriesId = this.seriesApiIds.get(series);
    if (seriesId === void 0) {
      return;
    }
    this.chartModel.removeSeries(seriesId);
    this.seriesApiIds.delete(series);
  }
  resize(width, height) {
    this.chartModel.resize(width, height);
  }
  timeScale() {
    return this.timeScaleApi;
  }
  dispose() {
    this.chartModel.dispose();
  }
};
function createChart(container, options) {
  return new ChartApiImpl(new ChartModel(container, options));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createChart
});
