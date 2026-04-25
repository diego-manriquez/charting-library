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
var MIN_VISIBLE_BARS = 10;
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
    const currentSpan = Math.max(1, this.visibleRange.to - this.visibleRange.from + 1);
    const visibleSpan = Math.min(currentSpan, length);
    const maxFrom = Math.max(0, length - visibleSpan);
    const from = clamp(this.visibleRange.from, 0, maxFrom);
    const to = Math.min(maxIndex, from + visibleSpan - 1);
    return { from, to };
  }
  zoom(length, anchorRatio, scaleFactor) {
    if (length <= 0 || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
      return;
    }
    const current = this.getVisibleRange(length);
    const currentSpan = current.to - current.from + 1;
    const nextSpan = clamp(
      Math.round(currentSpan * scaleFactor),
      Math.min(MIN_VISIBLE_BARS, length),
      length
    );
    const clampedAnchorRatio = clamp(anchorRatio, 0, 1);
    const anchorIndex = current.from + clampedAnchorRatio * Math.max(0, currentSpan - 1);
    let from = Math.round(anchorIndex - clampedAnchorRatio * Math.max(0, nextSpan - 1));
    const maxFrom = Math.max(0, length - nextSpan);
    from = clamp(from, 0, maxFrom);
    this.visibleRange = {
      from,
      to: from + nextSpan - 1
    };
  }
  pan(length, deltaBars) {
    if (length <= 0 || deltaBars === 0) {
      return;
    }
    const current = this.getVisibleRange(length);
    const span = current.to - current.from + 1;
    const maxFrom = Math.max(0, length - span);
    const from = clamp(current.from + deltaBars, 0, maxFrom);
    this.visibleRange = {
      from,
      to: from + span - 1
    };
  }
};
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

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

// src/rendering/common/chart-coordinates.ts
var PRICE_DECIMALS = 3;
function indexToX(index, visibleRange, plotArea) {
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const candleSpacing = plotArea.width / visibleCount;
  return plotArea.x + (index - visibleRange.from + 0.5) * candleSpacing;
}
function xToIndex(x, visibleRange, plotArea) {
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const candleSpacing = plotArea.width / visibleCount;
  const rawIndex = visibleRange.from + (x - plotArea.x) / candleSpacing - 0.5;
  return clamp2(
    Math.round(rawIndex),
    visibleRange.from,
    visibleRange.to
  );
}
function priceToY(price, range, plotArea) {
  const ratio = (price - range.min) / (range.max - range.min);
  return plotArea.y + plotArea.height - ratio * plotArea.height;
}
function yToPrice(y, range, plotArea) {
  const clampedY = clamp2(y, plotArea.y, plotArea.y + plotArea.height);
  const ratio = 1 - (clampedY - plotArea.y) / plotArea.height;
  return range.min + ratio * (range.max - range.min);
}
function formatPriceLabel(value) {
  return value.toFixed(PRICE_DECIMALS);
}
function formatTimeLabel(timestamp, visibleCount) {
  const date = new Date(timestamp);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  if (visibleCount <= 40) {
    return `${month}-${day}`;
  }
  return `${date.getUTCFullYear()}-${month}`;
}
function clamp2(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

// src/rendering/common/geometry.ts
function getChartLayout(size, padding, scales) {
  const innerWidth = Math.max(0, size.width - padding.left - padding.right);
  const innerHeight = Math.max(0, size.height - padding.top - padding.bottom);
  const priceScaleWidth = Math.min(scales.priceScaleWidth, innerWidth);
  const timeScaleHeight = Math.min(scales.timeScaleHeight, innerHeight);
  const plotWidth = Math.max(0, innerWidth - priceScaleWidth);
  const plotHeight = Math.max(0, innerHeight - timeScaleHeight);
  return {
    plotArea: {
      x: padding.left,
      y: padding.top,
      width: plotWidth,
      height: plotHeight
    },
    priceScaleArea: {
      x: padding.left + plotWidth,
      y: padding.top,
      width: priceScaleWidth,
      height: plotHeight
    },
    timeScaleArea: {
      x: padding.left,
      y: padding.top + plotHeight,
      width: plotWidth,
      height: timeScaleHeight
    }
  };
}

// src/rendering/renderers/crosshair-renderer.ts
function renderCrosshair(params) {
  const {
    context,
    plotArea,
    priceScaleArea,
    timeScaleArea,
    state,
    lineColor,
    textColor,
    accentColor
  } = params;
  context.save();
  context.strokeStyle = lineColor;
  context.lineWidth = 1;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(state.x, plotArea.y);
  context.lineTo(state.x, plotArea.y + plotArea.height);
  context.moveTo(plotArea.x, state.y);
  context.lineTo(plotArea.x + plotArea.width, state.y);
  context.stroke();
  context.setLineDash([]);
  drawAxisLabel({
    context,
    area: priceScaleArea,
    centerX: priceScaleArea.x + priceScaleArea.width / 2,
    centerY: state.y,
    text: state.priceLabel,
    textColor,
    backgroundColor: accentColor,
    horizontal: true
  });
  drawAxisLabel({
    context,
    area: timeScaleArea,
    centerX: state.x,
    centerY: timeScaleArea.y + timeScaleArea.height / 2,
    text: state.timeLabel,
    textColor,
    backgroundColor: accentColor,
    horizontal: false
  });
  context.restore();
}
function drawAxisLabel(params) {
  const {
    context,
    area,
    centerX,
    centerY,
    text,
    textColor,
    backgroundColor,
    horizontal
  } = params;
  const paddingX = 8;
  const paddingY = 4;
  context.font = "12px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const textWidth = context.measureText(text).width;
  const labelWidth = Math.min(area.width - 8, textWidth + paddingX * 2);
  const labelHeight = horizontal ? 20 : Math.min(area.height - 8, 20);
  const clampedCenterX = clamp3(
    centerX,
    area.x + labelWidth / 2 + 4,
    area.x + area.width - labelWidth / 2 - 4
  );
  const clampedCenterY = clamp3(
    centerY,
    area.y + labelHeight / 2 + 4,
    area.y + area.height - labelHeight / 2 - 4
  );
  const labelX = clampedCenterX - labelWidth / 2;
  const labelY = clampedCenterY - labelHeight / 2;
  context.fillStyle = backgroundColor;
  context.fillRect(labelX, labelY, labelWidth, labelHeight);
  context.fillStyle = textColor;
  context.fillText(text, clampedCenterX, clampedCenterY);
}
function clamp3(value, min, max) {
  return Math.max(min, Math.min(value, max));
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
    const x = indexToX(index, visibleRange, plotArea);
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
function getBufferValue(buffer, index) {
  const value = buffer[index];
  if (value === void 0) {
    throw new Error(`Missing buffer value at index ${index}.`);
  }
  return value;
}

// src/rendering/renderers/price-scale-renderer.ts
function renderPriceScale(params) {
  const {
    context,
    area,
    textColor,
    borderColor,
    backgroundColor,
    ticks
  } = params;
  if (area.width <= 0 || area.height <= 0) {
    return;
  }
  context.fillStyle = backgroundColor;
  context.fillRect(area.x, area.y, area.width, area.height);
  context.strokeStyle = borderColor;
  context.beginPath();
  context.moveTo(area.x + 0.5, area.y);
  context.lineTo(area.x + 0.5, area.y + area.height);
  context.stroke();
  context.fillStyle = textColor;
  context.font = "12px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const tick of ticks) {
    context.fillText(
      formatPriceLabel(tick.value),
      area.x + area.width / 2,
      tick.y
    );
  }
}
function getPriceScaleTicks(priceRange, plotArea, tickCount) {
  const safeTickCount = Math.max(2, tickCount);
  const approximateStep = (priceRange.max - priceRange.min) / Math.max(1, safeTickCount - 1);
  const step = getNiceStep(approximateStep);
  let start = Math.ceil(priceRange.min / step) * step;
  let end = Math.floor(priceRange.max / step) * step;
  if (start > end) {
    start = Math.floor(priceRange.min / step) * step;
    end = Math.ceil(priceRange.max / step) * step;
  }
  const ticks = [];
  for (let value = end; value >= start - step * 0.5; value -= step) {
    const normalizedValue = normalizeTickValue(value);
    ticks.push({
      y: priceToY(normalizedValue, priceRange, plotArea),
      value: normalizedValue
    });
  }
  if (ticks.length === 0) {
    const mid = normalizeTickValue((priceRange.min + priceRange.max) / 2);
    ticks.push({
      y: priceToY(mid, priceRange, plotArea),
      value: mid
    });
  }
  return ticks;
}
function getNiceStep(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction = 10;
  if (fraction < 1.5) {
    niceFraction = 1;
  } else if (fraction < 3) {
    niceFraction = 2;
  } else if (fraction < 7) {
    niceFraction = 5;
  }
  return niceFraction * 10 ** exponent;
}
function normalizeTickValue(value) {
  return Number(value.toFixed(8));
}

// src/rendering/renderers/time-scale-renderer.ts
function renderTimeScale(params) {
  const {
    context,
    area,
    plotArea,
    buffer,
    visibleRange,
    textColor,
    borderColor,
    backgroundColor,
    tickCount
  } = params;
  if (area.width <= 0 || area.height <= 0) {
    return;
  }
  context.fillStyle = backgroundColor;
  context.fillRect(area.x, area.y, area.width, area.height);
  context.strokeStyle = borderColor;
  context.beginPath();
  context.moveTo(area.x, area.y + 0.5);
  context.lineTo(area.x + area.width, area.y + 0.5);
  context.stroke();
  if (!buffer || buffer.length === 0) {
    return;
  }
  context.fillStyle = textColor;
  context.font = "12px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const tick of getTimeScaleTicks(buffer, visibleRange, plotArea, tickCount)) {
    context.fillText(tick.label, tick.x, area.y + area.height / 2);
  }
}
function getTimeScaleTicks(buffer, visibleRange, plotArea, tickCount) {
  const ticks = [];
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const safeTickCount = Math.max(2, Math.min(tickCount, visibleCount));
  const denominator = Math.max(1, safeTickCount - 1);
  for (let tickIndex = 0; tickIndex < safeTickCount; tickIndex += 1) {
    const ratio = tickIndex / denominator;
    const index = Math.min(
      visibleRange.to,
      visibleRange.from + Math.round(ratio * (visibleCount - 1))
    );
    const timestamp = buffer.time[index];
    if (timestamp === void 0) {
      continue;
    }
    ticks.push({
      x: plotArea.x + ratio * plotArea.width,
      label: formatTimeLabel(timestamp, visibleCount)
    });
  }
  return dedupeTicks(ticks);
}
function dedupeTicks(ticks) {
  const deduped = [];
  let previousLabel = "";
  for (const tick of ticks) {
    if (tick.label === previousLabel) {
      continue;
    }
    deduped.push(tick);
    previousLabel = tick.label;
  }
  return deduped;
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
var PRICE_SCALE_WIDTH = 72;
var TIME_SCALE_HEIGHT = 28;
var AXIS_BACKGROUND = "#0f172a";
var CROSSHAIR_LINE_COLOR = "rgba(226, 232, 240, 0.65)";
var CROSSHAIR_LABEL_COLOR = "#1d4ed8";
var ZOOM_IN_FACTOR = 0.85;
var ZOOM_OUT_FACTOR = 1.15;
var ChartModel = class {
  constructor(container, options) {
    this.container = container;
    this.options = resolveChartOptions(options);
    this.layerManager = new CanvasLayerManager(container);
    this.size = this.resolveInitialSize();
    this.applyContainerStyles();
    this.layerManager.resize(this.size);
    this.bindPointerEvents();
    this.bindContainerResize();
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
  crosshair;
  activePointerId;
  lastPanX;
  resizeObserver;
  handlePointerMove = (event) => {
    this.handlePointerMoveEvent(event);
  };
  handlePointerDown = (event) => {
    this.handlePointerDownEvent(event);
  };
  handlePointerUp = (event) => {
    this.handlePointerUpEvent(event);
  };
  handlePointerCancel = (event) => {
    this.handlePointerUpEvent(event);
  };
  handlePointerLeave = () => {
    if (this.activePointerId !== void 0) {
      return;
    }
    if (!this.crosshair) {
      return;
    }
    this.crosshair = void 0;
    this.render();
  };
  handleWheel = (event) => {
    this.handleWheelEvent(event);
  };
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
    const layout = getChartLayout(this.size, this.options.padding, {
      priceScaleWidth: PRICE_SCALE_WIDTH,
      timeScaleHeight: TIME_SCALE_HEIGHT
    });
    const plotArea = layout.plotArea;
    const buffers = Array.from(this.series.values(), (series) => series.buffer);
    const primaryBuffer = buffers.find((buffer) => buffer.length > 0);
    const maxLength = this.getMaxSeriesLength();
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const priceRange = this.priceScaleModel.getVisiblePriceRange(
      buffers,
      visibleRange
    );
    const priceScaleTicks = getPriceScaleTicks(
      priceRange,
      plotArea,
      this.options.grid.horizontalLines + 1
    );
    this.layerManager.clear();
    drawBackground(context, this.size, this.options.backgroundColor);
    drawGrid(context, layout, this.options, priceScaleTicks);
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
    renderPriceScale({
      context,
      area: layout.priceScaleArea,
      textColor: this.options.textColor,
      borderColor: this.options.grid.color,
      backgroundColor: AXIS_BACKGROUND,
      ticks: priceScaleTicks
    });
    renderTimeScale({
      context,
      area: layout.timeScaleArea,
      plotArea,
      buffer: primaryBuffer,
      visibleRange,
      textColor: this.options.textColor,
      borderColor: this.options.grid.color,
      backgroundColor: AXIS_BACKGROUND,
      tickCount: this.options.grid.verticalLines + 1
    });
    if (this.crosshair) {
      renderCrosshair({
        context,
        plotArea,
        priceScaleArea: layout.priceScaleArea,
        timeScaleArea: layout.timeScaleArea,
        state: this.crosshair,
        lineColor: CROSSHAIR_LINE_COLOR,
        textColor: "#eff6ff",
        accentColor: CROSSHAIR_LABEL_COLOR
      });
    }
  }
  dispose() {
    this.resizeObserver?.disconnect();
    this.unbindPointerEvents();
    this.series.clear();
    this.layerManager.dispose();
  }
  resolveInitialSize() {
    const measuredSize = measureElementSize(this.container);
    return {
      width: Math.max(
        1,
        this.options.width ?? measuredSize.width
      ),
      height: Math.max(
        1,
        this.options.height ?? measuredSize.height
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
  bindContainerResize() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.options.width !== void 0 && this.options.height !== void 0) {
          return;
        }
        const nextSize = this.resolveInitialSize();
        if (nextSize.width === this.size.width && nextSize.height === this.size.height) {
          return;
        }
        this.resize(nextSize.width, nextSize.height);
      });
      this.resizeObserver.observe(this.container);
    }
    requestAnimationFrame(() => {
      if (!this.container.isConnected) {
        return;
      }
      const nextSize = this.resolveInitialSize();
      if (nextSize.width === this.size.width && nextSize.height === this.size.height) {
        return;
      }
      this.resize(nextSize.width, nextSize.height);
    });
  }
  bindPointerEvents() {
    this.container.addEventListener("pointerdown", this.handlePointerDown);
    this.container.addEventListener("pointermove", this.handlePointerMove);
    this.container.addEventListener("pointerup", this.handlePointerUp);
    this.container.addEventListener("pointercancel", this.handlePointerCancel);
    this.container.addEventListener("pointerleave", this.handlePointerLeave);
    this.container.addEventListener("wheel", this.handleWheel, {
      passive: false
    });
  }
  unbindPointerEvents() {
    this.container.removeEventListener("pointerdown", this.handlePointerDown);
    this.container.removeEventListener("pointermove", this.handlePointerMove);
    this.container.removeEventListener("pointerup", this.handlePointerUp);
    this.container.removeEventListener("pointercancel", this.handlePointerCancel);
    this.container.removeEventListener("pointerleave", this.handlePointerLeave);
    this.container.removeEventListener("wheel", this.handleWheel);
  }
  handlePointerMoveEvent(event) {
    if (this.activePointerId === event.pointerId && this.lastPanX !== void 0) {
      this.panFromPointer(event);
    }
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }
  handlePointerDownEvent(event) {
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    if (!isPointInPlotArea(pointerX, pointerY, layout.plotArea)) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.lastPanX = pointerX;
    this.container.setPointerCapture?.(event.pointerId);
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }
  handlePointerUpEvent(event) {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    this.activePointerId = void 0;
    this.lastPanX = void 0;
    this.container.releasePointerCapture?.(event.pointerId);
  }
  handleWheelEvent(event) {
    const primaryBuffer = this.getPrimaryBuffer();
    const maxLength = this.getMaxSeriesLength();
    if (!primaryBuffer || maxLength <= 0) {
      return;
    }
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    if (!isPointInPlotArea(pointerX, pointerY, layout.plotArea)) {
      return;
    }
    event.preventDefault();
    const anchorRatio = layout.plotArea.width <= 0 ? 0.5 : (pointerX - layout.plotArea.x) / layout.plotArea.width;
    const scaleFactor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
    this.timeScaleModel.zoom(maxLength, anchorRatio, scaleFactor);
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }
  updateCrosshairFromClientPoint(clientX, clientY) {
    const primaryBuffer = this.getPrimaryBuffer();
    const maxLength = this.getMaxSeriesLength();
    if (!primaryBuffer || maxLength === 0) {
      this.handlePointerLeave();
      return;
    }
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const priceRange = this.priceScaleModel.getVisiblePriceRange(
      Array.from(this.series.values(), (series) => series.buffer),
      visibleRange
    );
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const plotArea = layout.plotArea;
    if (!isPointInPlotArea(pointerX, pointerY, plotArea)) {
      this.handlePointerLeave();
      return;
    }
    const x = clamp2(pointerX, plotArea.x, plotArea.x + plotArea.width);
    const y = clamp2(pointerY, plotArea.y, plotArea.y + plotArea.height);
    const dataIndex = xToIndex(x, visibleRange, plotArea);
    const timestamp = primaryBuffer.time[dataIndex];
    if (timestamp === void 0) {
      return;
    }
    this.crosshair = {
      x,
      y,
      priceLabel: formatPriceLabel(yToPrice(y, priceRange, plotArea)),
      timeLabel: formatTimeLabel(
        timestamp,
        Math.max(1, visibleRange.to - visibleRange.from + 1)
      )
    };
    this.render();
  }
  panFromPointer(event) {
    if (this.lastPanX === void 0) {
      return;
    }
    const maxLength = this.getMaxSeriesLength();
    if (maxLength <= 0) {
      return;
    }
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const deltaX = pointerX - this.lastPanX;
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
    const candleSpacing = layout.plotArea.width / visibleCount;
    if (candleSpacing <= 0) {
      return;
    }
    const deltaBars = -Math.round(deltaX / candleSpacing);
    if (deltaBars === 0) {
      return;
    }
    this.timeScaleModel.pan(maxLength, deltaBars);
    this.lastPanX = pointerX;
  }
  getPrimaryBuffer() {
    for (const series of this.series.values()) {
      if (series.buffer.length > 0) {
        return series.buffer;
      }
    }
    return void 0;
  }
  getLayout() {
    return getChartLayout(this.size, this.options.padding, {
      priceScaleWidth: PRICE_SCALE_WIDTH,
      timeScaleHeight: TIME_SCALE_HEIGHT
    });
  }
};
function measureElementSize(element) {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(element.clientWidth, Math.round(rect.width), 0),
    height: Math.max(element.clientHeight, Math.round(rect.height), 0)
  };
}
function drawBackground(context, size, color) {
  context.fillStyle = color;
  context.fillRect(0, 0, size.width, size.height);
}
function drawGrid(context, layout, options, priceScaleTicks) {
  const plotArea = layout.plotArea;
  if (!options.grid.visible || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }
  context.strokeStyle = options.grid.color;
  context.lineWidth = 1;
  const verticalStep = plotArea.width / options.grid.verticalLines;
  if (priceScaleTicks && priceScaleTicks.length > 0) {
    for (const tick of priceScaleTicks) {
      context.beginPath();
      context.moveTo(plotArea.x, tick.y);
      context.lineTo(plotArea.x + plotArea.width, tick.y);
      context.stroke();
    }
  } else {
    const horizontalStep = plotArea.height / options.grid.horizontalLines;
    for (let index = 0; index <= options.grid.horizontalLines; index += 1) {
      const y = plotArea.y + index * horizontalStep;
      context.beginPath();
      context.moveTo(plotArea.x, y);
      context.lineTo(plotArea.x + plotArea.width, y);
      context.stroke();
    }
  }
  for (let index = 0; index <= options.grid.verticalLines; index += 1) {
    const x = plotArea.x + index * verticalStep;
    context.beginPath();
    context.moveTo(x, plotArea.y);
    context.lineTo(x, plotArea.y + plotArea.height);
    context.stroke();
  }
}
function isPointInPlotArea(x, y, plotArea) {
  return x >= plotArea.x && x <= plotArea.x + plotArea.width && y >= plotArea.y && y <= plotArea.y + plotArea.height;
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
