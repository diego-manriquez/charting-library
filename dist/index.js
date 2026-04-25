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
var MIN_PRICE_SPAN = 1e-6;
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
        if (isLineBuffer(buffer)) {
          min = Math.min(min, buffer.value[index] ?? min);
          max = Math.max(max, buffer.value[index] ?? max);
          continue;
        }
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
function zoomPriceRange(range, anchorPrice, scaleFactor) {
  const safeScaleFactor = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  const nextMin = anchorPrice - (anchorPrice - range.min) * safeScaleFactor;
  const nextMax = anchorPrice + (range.max - anchorPrice) * safeScaleFactor;
  return normalizePriceRange({
    min: nextMin,
    max: nextMax
  });
}
function panPriceRange(range, deltaPrice) {
  return normalizePriceRange({
    min: range.min + deltaPrice,
    max: range.max + deltaPrice
  });
}
function normalizePriceRange(range) {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
    return DEFAULT_PRICE_RANGE;
  }
  if (range.max - range.min >= MIN_PRICE_SPAN) {
    return range;
  }
  const center = (range.min + range.max) / 2;
  return {
    min: center - MIN_PRICE_SPAN / 2,
    max: center + MIN_PRICE_SPAN / 2
  };
}
function isLineBuffer(buffer) {
  return "value" in buffer;
}

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
  isRightEdgeVisible(length) {
    if (length <= 0) {
      return true;
    }
    const visibleRange = this.getVisibleRange(length);
    return visibleRange.to >= length - 1;
  }
};
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

// src/core/scales/volume-scale.ts
var DEFAULT_VOLUME_RANGE = {
  min: 0,
  max: 1
};
var VolumeScaleModel = class {
  getVisibleVolumeRange(buffers, visibleRange) {
    let max = Number.NEGATIVE_INFINITY;
    for (const buffer of buffers) {
      if (buffer.length === 0) {
        continue;
      }
      const from = Math.max(0, Math.min(visibleRange.from, buffer.length - 1));
      const to = Math.max(from, Math.min(visibleRange.to, buffer.length - 1));
      for (let index = from; index <= to; index += 1) {
        max = Math.max(max, buffer.value[index] ?? max);
      }
    }
    if (!Number.isFinite(max) || max <= 0) {
      return DEFAULT_VOLUME_RANGE;
    }
    return {
      min: 0,
      max: max * 1.1
    };
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
  const contentHeight = Math.max(0, innerHeight - timeScaleHeight);
  const paneGap = scales.secondaryPaneHeight !== void 0 ? Math.max(0, scales.paneGap ?? 0) : 0;
  const secondaryPaneHeight = scales.secondaryPaneHeight ? Math.min(scales.secondaryPaneHeight, Math.max(0, contentHeight - paneGap)) : 0;
  const plotHeight = Math.max(0, contentHeight - secondaryPaneHeight - paneGap);
  const secondaryY = padding.top + plotHeight + paneGap;
  const layout = {
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
      y: padding.top + plotHeight + paneGap + secondaryPaneHeight,
      width: plotWidth,
      height: timeScaleHeight
    }
  };
  if (secondaryPaneHeight > 0) {
    layout.secondaryPlotArea = {
      x: padding.left,
      y: secondaryY,
      width: plotWidth,
      height: secondaryPaneHeight
    };
    layout.secondaryPriceScaleArea = {
      x: padding.left + plotWidth,
      y: secondaryY,
      width: priceScaleWidth,
      height: secondaryPaneHeight
    };
  }
  return layout;
}

// src/rendering/renderers/crosshair-renderer.ts
function renderCrosshair(params) {
  const {
    context,
    plotAreas,
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
  const verticalTop = plotAreas[0]?.y ?? state.horizontalArea.y;
  const lastPlotArea = plotAreas[plotAreas.length - 1] ?? state.horizontalArea;
  const verticalBottom = lastPlotArea.y + lastPlotArea.height;
  context.beginPath();
  context.moveTo(state.x, verticalTop);
  context.lineTo(state.x, verticalBottom);
  context.moveTo(state.horizontalArea.x, state.y);
  context.lineTo(state.horizontalArea.x + state.horizontalArea.width, state.y);
  context.stroke();
  context.setLineDash([]);
  drawAxisLabel({
    context,
    area: state.priceScaleArea,
    centerX: state.priceScaleArea.x + state.priceScaleArea.width / 2,
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

// src/rendering/renderers/line-renderer.ts
var DEFAULT_LINE_SERIES_OPTIONS = {
  color: "#f59e0b",
  lineWidth: 2
};
function resolveLineSeriesOptions(options) {
  return {
    color: options?.color ?? DEFAULT_LINE_SERIES_OPTIONS.color,
    lineWidth: options?.lineWidth ?? DEFAULT_LINE_SERIES_OPTIONS.lineWidth
  };
}
function renderLineSeries(params) {
  const { context, buffer, options, visibleRange, priceRange, plotArea } = params;
  if (buffer.length === 0 || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }
  context.strokeStyle = options.color;
  context.lineWidth = options.lineWidth;
  context.beginPath();
  let hasStarted = false;
  for (let index = visibleRange.from; index <= visibleRange.to; index += 1) {
    const value = buffer.value[index];
    if (value === void 0) {
      continue;
    }
    const x = indexToX(index, visibleRange, plotArea);
    const y = priceToY(value, priceRange, plotArea);
    if (!hasStarted) {
      context.moveTo(x, y);
      hasStarted = true;
      continue;
    }
    context.lineTo(x, y);
  }
  if (hasStarted) {
    context.stroke();
  }
}

// src/rendering/renderers/volume-renderer.ts
var DEFAULT_VOLUME_SERIES_OPTIONS = {
  color: "rgba(59, 130, 246, 0.45)",
  barSpacingRatio: 0.72
};
function resolveVolumeSeriesOptions(options) {
  return {
    color: options?.color ?? DEFAULT_VOLUME_SERIES_OPTIONS.color,
    barSpacingRatio: options?.barSpacingRatio ?? DEFAULT_VOLUME_SERIES_OPTIONS.barSpacingRatio
  };
}
function renderVolumeSeries(params) {
  const { context, buffer, options, visibleRange, valueRange, plotArea } = params;
  if (buffer.length === 0 || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const barSpacing = plotArea.width / visibleCount;
  const barWidth = Math.max(
    1,
    Math.min(16, barSpacing * options.barSpacingRatio)
  );
  const baseY = plotArea.y + plotArea.height;
  for (let index = visibleRange.from; index <= visibleRange.to; index += 1) {
    const value = buffer.value[index];
    if (value === void 0) {
      continue;
    }
    const x = indexToX(index, visibleRange, plotArea);
    const y = priceToY(value, valueRange, plotArea);
    const color = buffer.color[index] ?? options.color;
    context.fillStyle = color;
    context.fillRect(x - barWidth / 2, y, barWidth, Math.max(1, baseY - y));
  }
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

// src/core/series/series-types.ts
function getSeriesBufferLength(buffer) {
  return buffer.length;
}
function getSeriesBufferTimeAt(buffer, index) {
  return buffer.time[index];
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
    const timestamp = getSeriesBufferTimeAt(buffer, index);
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
function updateCandleBuffer(buffer, data) {
  const timestamp = normalizeTimestamp(data.time);
  validateCandle(data, buffer.length, timestamp);
  if (buffer.length === 0) {
    return createCandleBuffer([data]);
  }
  const lastIndex = buffer.length - 1;
  const lastTimestamp = buffer.time[lastIndex];
  if (lastTimestamp === void 0) {
    throw new Error("Missing last candle timestamp.");
  }
  if (timestamp < lastTimestamp) {
    throw new Error("New candle time must be >= the last candle time.");
  }
  if (timestamp === lastTimestamp) {
    return replaceLastCandle(buffer, timestamp, data);
  }
  return appendCandle(buffer, timestamp, data);
}
function replaceLastCandle(buffer, timestamp, data) {
  const nextBuffer = cloneBuffer(buffer);
  const lastIndex = nextBuffer.length - 1;
  nextBuffer.time[lastIndex] = timestamp;
  nextBuffer.open[lastIndex] = data.open;
  nextBuffer.high[lastIndex] = data.high;
  nextBuffer.low[lastIndex] = data.low;
  nextBuffer.close[lastIndex] = data.close;
  nextBuffer.volume[lastIndex] = data.volume ?? 0;
  return nextBuffer;
}
function appendCandle(buffer, timestamp, data) {
  const nextLength = buffer.length + 1;
  const nextBuffer = {
    time: copyWithExpandedCapacity(buffer.time, nextLength),
    open: copyWithExpandedCapacity(buffer.open, nextLength),
    high: copyWithExpandedCapacity(buffer.high, nextLength),
    low: copyWithExpandedCapacity(buffer.low, nextLength),
    close: copyWithExpandedCapacity(buffer.close, nextLength),
    volume: copyWithExpandedCapacity(buffer.volume, nextLength),
    length: nextLength
  };
  const lastIndex = nextLength - 1;
  nextBuffer.time[lastIndex] = timestamp;
  nextBuffer.open[lastIndex] = data.open;
  nextBuffer.high[lastIndex] = data.high;
  nextBuffer.low[lastIndex] = data.low;
  nextBuffer.close[lastIndex] = data.close;
  nextBuffer.volume[lastIndex] = data.volume ?? 0;
  return nextBuffer;
}
function cloneBuffer(buffer) {
  return {
    time: buffer.time.slice(),
    open: buffer.open.slice(),
    high: buffer.high.slice(),
    low: buffer.low.slice(),
    close: buffer.close.slice(),
    volume: buffer.volume.slice(),
    length: buffer.length
  };
}
function copyWithExpandedCapacity(source, nextLength) {
  const next = new Float64Array(nextLength);
  next.set(source);
  return next;
}
function normalizeTimestamp(time) {
  return time instanceof Date ? time.getTime() : time;
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

// src/data/adapters/line-data-adapter.ts
function createLineBuffer(data) {
  const length = data.length;
  const time = new Float64Array(length);
  const value = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    const point = data[index];
    if (!point) {
      throw new Error(`Missing line point at index ${index}.`);
    }
    const timestamp = normalizeTimestamp2(point.time);
    validateLinePoint(point, index, timestamp);
    time[index] = timestamp;
    value[index] = point.value;
  }
  return {
    time,
    value,
    length
  };
}
function updateLineBuffer(buffer, data) {
  const timestamp = normalizeTimestamp2(data.time);
  validateLinePoint(data, buffer.length, timestamp);
  if (buffer.length === 0) {
    return createLineBuffer([data]);
  }
  const lastIndex = buffer.length - 1;
  const lastTimestamp = buffer.time[lastIndex];
  if (lastTimestamp === void 0) {
    throw new Error("Missing last line point timestamp.");
  }
  if (timestamp < lastTimestamp) {
    throw new Error("New line point time must be >= the last point time.");
  }
  if (timestamp === lastTimestamp) {
    const nextBuffer2 = cloneBuffer2(buffer);
    nextBuffer2.time[lastIndex] = timestamp;
    nextBuffer2.value[lastIndex] = data.value;
    return nextBuffer2;
  }
  const nextLength = buffer.length + 1;
  const nextBuffer = {
    time: copyWithExpandedCapacity2(buffer.time, nextLength),
    value: copyWithExpandedCapacity2(buffer.value, nextLength),
    length: nextLength
  };
  nextBuffer.time[nextLength - 1] = timestamp;
  nextBuffer.value[nextLength - 1] = data.value;
  return nextBuffer;
}
function validateLinePoint(point, index, timestamp) {
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid line point time at index ${index}.`);
  }
  if (!Number.isFinite(point.value)) {
    throw new Error(`Invalid line point value at index ${index}.`);
  }
}
function normalizeTimestamp2(time) {
  return time instanceof Date ? time.getTime() : time;
}
function cloneBuffer2(buffer) {
  return {
    time: buffer.time.slice(),
    value: buffer.value.slice(),
    length: buffer.length
  };
}
function copyWithExpandedCapacity2(source, nextLength) {
  const next = new Float64Array(nextLength);
  next.set(source);
  return next;
}

// src/data/adapters/volume-data-adapter.ts
function createVolumeBuffer(data) {
  const length = data.length;
  const time = new Float64Array(length);
  const value = new Float64Array(length);
  const color = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const point = data[index];
    if (!point) {
      throw new Error(`Missing volume point at index ${index}.`);
    }
    const timestamp = normalizeTimestamp3(point.time);
    validateVolumePoint(point, index, timestamp);
    time[index] = timestamp;
    value[index] = point.value;
    color[index] = point.color;
  }
  return {
    time,
    value,
    color,
    length
  };
}
function updateVolumeBuffer(buffer, data) {
  const timestamp = normalizeTimestamp3(data.time);
  validateVolumePoint(data, buffer.length, timestamp);
  if (buffer.length === 0) {
    return createVolumeBuffer([data]);
  }
  const lastIndex = buffer.length - 1;
  const lastTimestamp = buffer.time[lastIndex];
  if (lastTimestamp === void 0) {
    throw new Error("Missing last volume point timestamp.");
  }
  if (timestamp < lastTimestamp) {
    throw new Error("New volume point time must be >= the last point time.");
  }
  if (timestamp === lastTimestamp) {
    const nextBuffer2 = cloneBuffer3(buffer);
    nextBuffer2.time[lastIndex] = timestamp;
    nextBuffer2.value[lastIndex] = data.value;
    nextBuffer2.color[lastIndex] = data.color;
    return nextBuffer2;
  }
  const nextLength = buffer.length + 1;
  const nextBuffer = {
    time: copyWithExpandedCapacity3(buffer.time, nextLength),
    value: copyWithExpandedCapacity3(buffer.value, nextLength),
    color: buffer.color.slice(),
    length: nextLength
  };
  nextBuffer.time[nextLength - 1] = timestamp;
  nextBuffer.value[nextLength - 1] = data.value;
  nextBuffer.color[nextLength - 1] = data.color;
  return nextBuffer;
}
function validateVolumePoint(point, index, timestamp) {
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid volume point time at index ${index}.`);
  }
  if (!Number.isFinite(point.value) || point.value < 0) {
    throw new Error(`Invalid volume point value at index ${index}.`);
  }
}
function normalizeTimestamp3(time) {
  return time instanceof Date ? time.getTime() : time;
}
function cloneBuffer3(buffer) {
  return {
    time: buffer.time.slice(),
    value: buffer.value.slice(),
    color: buffer.color.slice(),
    length: buffer.length
  };
}
function copyWithExpandedCapacity3(source, nextLength) {
  const next = new Float64Array(nextLength);
  next.set(source);
  return next;
}

// src/core/events/event-emitter.ts
var EventEmitter = class {
  listeners = /* @__PURE__ */ new Set();
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit(payload) {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
  clear() {
    this.listeners.clear();
  }
};

// src/core/chart/chart-model.ts
var PRICE_SCALE_WIDTH = 72;
var TIME_SCALE_HEIGHT = 28;
var AXIS_BACKGROUND = "#0f172a";
var CROSSHAIR_LINE_COLOR = "rgba(226, 232, 240, 0.65)";
var CROSSHAIR_LABEL_COLOR = "#1d4ed8";
var ZOOM_IN_FACTOR = 0.85;
var ZOOM_OUT_FACTOR = 1.15;
var SECONDARY_PANE_GAP = 8;
var VOLUME_PANE_HEIGHT = 104;
var VERTICAL_ZOOM_IN_FACTOR = 0.9;
var VERTICAL_ZOOM_OUT_FACTOR = 1.1;
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
  volumeScaleModel = new VolumeScaleModel();
  layerManager;
  series = /* @__PURE__ */ new Map();
  crosshairMoveEmitter = new EventEmitter();
  visibleRangeEmitter = new EventEmitter();
  nextSeriesId = 1;
  size;
  crosshair;
  lastEmittedVisibleRange;
  paneScaleState = {
    main: void 0,
    secondary: void 0
  };
  dragInteraction;
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
    if (this.dragInteraction) {
      return;
    }
    if (!this.crosshair) {
      return;
    }
    this.crosshair = void 0;
    this.crosshairMoveEmitter.emit({
      point: void 0,
      time: void 0,
      price: void 0
    });
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
      type: "candlestick",
      options: resolveSeriesOptions(options),
      buffer: createCandleBuffer([])
    });
    this.render();
    return id;
  }
  addLineSeries(options) {
    const id = this.nextSeriesId;
    this.nextSeriesId += 1;
    this.series.set(id, {
      id,
      type: "line",
      options: resolveLineSeriesOptions(options),
      buffer: createLineBuffer([])
    });
    this.render();
    return id;
  }
  addVolumeSeries(options) {
    const id = this.nextSeriesId;
    this.nextSeriesId += 1;
    this.series.set(id, {
      id,
      type: "volume",
      options: resolveVolumeSeriesOptions(options),
      buffer: createVolumeBuffer([])
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
    if (!series || series.type !== "candlestick") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    series.buffer = createCandleBuffer(data);
    this.fitContent();
    this.render();
  }
  updateSeriesData(seriesId, data) {
    const series = this.series.get(seriesId);
    if (!series || series.type !== "candlestick") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    const previousLength = series.buffer.length;
    const wasFollowingLatest = this.timeScaleModel.isRightEdgeVisible(previousLength);
    const lastTimestamp = previousLength > 0 ? series.buffer.time[previousLength - 1] : void 0;
    series.buffer = updateCandleBuffer(series.buffer, data);
    if (previousLength === 0) {
      this.fitContent();
    } else if (series.buffer.length > previousLength && wasFollowingLatest) {
      this.timeScaleModel.pan(series.buffer.length, 1);
    }
    if (lastTimestamp === void 0 || data.time !== lastTimestamp) {
      this.render();
      return;
    }
    this.render();
  }
  setLineSeriesData(seriesId, data) {
    const series = this.series.get(seriesId);
    if (!series || series.type !== "line") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    series.buffer = createLineBuffer(data);
    this.fitContent();
    this.render();
  }
  updateLineSeriesData(seriesId, data) {
    const series = this.series.get(seriesId);
    if (!series || series.type !== "line") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    const previousLength = series.buffer.length;
    const wasFollowingLatest = this.timeScaleModel.isRightEdgeVisible(previousLength);
    series.buffer = updateLineBuffer(series.buffer, data);
    if (previousLength === 0) {
      this.fitContent();
    } else if (series.buffer.length > previousLength && wasFollowingLatest) {
      this.timeScaleModel.pan(series.buffer.length, 1);
    }
    this.render();
  }
  setVolumeSeriesData(seriesId, data) {
    const series = this.series.get(seriesId);
    if (!series || series.type !== "volume") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    series.buffer = createVolumeBuffer(data);
    this.fitContent();
    this.render();
  }
  updateVolumeSeriesData(seriesId, data) {
    const series = this.series.get(seriesId);
    if (!series || series.type !== "volume") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }
    const previousLength = series.buffer.length;
    const wasFollowingLatest = this.timeScaleModel.isRightEdgeVisible(previousLength);
    series.buffer = updateVolumeBuffer(series.buffer, data);
    if (previousLength === 0) {
      this.fitContent();
    } else if (series.buffer.length > previousLength && wasFollowingLatest) {
      this.timeScaleModel.pan(series.buffer.length, 1);
    }
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
  subscribeCrosshairMove(handler) {
    return this.crosshairMoveEmitter.subscribe(handler);
  }
  subscribeVisibleRangeChange(handler) {
    return this.visibleRangeEmitter.subscribe(handler);
  }
  render() {
    const hasSecondaryPane = this.hasVolumeSeries();
    const context = this.layerManager.getContext();
    const layout = getChartLayout(
      this.size,
      this.options.padding,
      getLayoutOptions(hasSecondaryPane)
    );
    const plotArea = layout.plotArea;
    const mainSeries = this.getMainSeries();
    const volumeSeries = this.getVolumeSeries();
    const buffers = Array.from(this.series.values(), (series) => series.buffer);
    const primaryBuffer = buffers.find((buffer) => buffer.length > 0);
    const maxLength = this.getMaxSeriesLength();
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const autoPriceRange = this.priceScaleModel.getVisiblePriceRange(
      mainSeries.map((series) => series.buffer),
      visibleRange
    );
    const priceRange = this.paneScaleState.main ?? autoPriceRange;
    const volumeRange = layout.secondaryPlotArea && layout.secondaryPriceScaleArea ? this.paneScaleState.secondary ?? this.volumeScaleModel.getVisibleVolumeRange(
      volumeSeries.map((series) => series.buffer),
      visibleRange
    ) : void 0;
    const priceScaleTicks = getPriceScaleTicks(
      priceRange,
      plotArea,
      this.options.grid.horizontalLines + 1
    );
    const volumeScaleTicks = volumeRange && layout.secondaryPlotArea ? getPriceScaleTicks(volumeRange, layout.secondaryPlotArea, 3) : void 0;
    this.layerManager.clear();
    drawBackground(context, this.size, this.options.backgroundColor);
    drawGrid(context, layout, this.options, priceScaleTicks, volumeScaleTicks);
    for (const series of mainSeries) {
      if (series.type === "candlestick") {
        renderCandlesticks({
          context,
          buffer: series.buffer,
          options: series.options,
          visibleRange,
          priceRange,
          plotArea
        });
        continue;
      }
      renderLineSeries({
        context,
        buffer: series.buffer,
        options: series.options,
        visibleRange,
        priceRange,
        plotArea
      });
    }
    if (layout.secondaryPlotArea && volumeRange) {
      for (const series of volumeSeries) {
        renderVolumeSeries({
          context,
          buffer: series.buffer,
          options: series.options,
          visibleRange,
          valueRange: volumeRange,
          plotArea: layout.secondaryPlotArea
        });
      }
    }
    renderPriceScale({
      context,
      area: layout.priceScaleArea,
      textColor: this.options.textColor,
      borderColor: this.options.grid.color,
      backgroundColor: AXIS_BACKGROUND,
      ticks: priceScaleTicks
    });
    if (layout.secondaryPriceScaleArea && volumeScaleTicks) {
      renderPriceScale({
        context,
        area: layout.secondaryPriceScaleArea,
        textColor: this.options.textColor,
        borderColor: this.options.grid.color,
        backgroundColor: AXIS_BACKGROUND,
        ticks: volumeScaleTicks
      });
    }
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
    this.emitVisibleRangeIfChanged(visibleRange, maxLength);
    if (this.crosshair) {
      renderCrosshair({
        context,
        plotAreas: layout.secondaryPlotArea ? [layout.plotArea, layout.secondaryPlotArea] : [layout.plotArea],
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
    this.crosshairMoveEmitter.clear();
    this.visibleRangeEmitter.clear();
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
      maxLength = Math.max(maxLength, getSeriesBufferLength(series.buffer));
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
    if (this.dragInteraction?.pointerId === event.pointerId) {
      if (this.dragInteraction.type === "horizontal-pan") {
        this.panFromPointer(event);
      } else {
        this.panPriceScaleFromPointer(event, this.dragInteraction.pane);
      }
    }
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }
  handlePointerDownEvent(event) {
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const target = getPointerTarget(layout, pointerX, pointerY);
    if (!target) {
      return;
    }
    this.dragInteraction = target.region === "plot" ? {
      type: "horizontal-pan",
      pointerId: event.pointerId,
      lastX: pointerX
    } : {
      type: "vertical-pan",
      pointerId: event.pointerId,
      pane: target.pane,
      lastY: pointerY
    };
    this.container.setPointerCapture?.(event.pointerId);
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }
  handlePointerUpEvent(event) {
    if (this.dragInteraction?.pointerId !== event.pointerId) {
      return;
    }
    this.dragInteraction = void 0;
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
    const target = getPointerTarget(layout, pointerX, pointerY);
    if (!target) {
      return;
    }
    event.preventDefault();
    if (target.region === "price-scale") {
      this.zoomPriceScaleAtPoint(
        target.pane,
        pointerY,
        event.deltaY < 0 ? VERTICAL_ZOOM_IN_FACTOR : VERTICAL_ZOOM_OUT_FACTOR
      );
      this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
      return;
    }
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
    const mainSeries = this.getMainSeries();
    const volumeSeries = this.getVolumeSeries();
    const autoPriceRange = this.priceScaleModel.getVisiblePriceRange(
      mainSeries.map((series) => series.buffer),
      visibleRange
    );
    const priceRange = this.paneScaleState.main ?? autoPriceRange;
    const layout = this.getLayout();
    const volumeRange = layout.secondaryPlotArea && layout.secondaryPriceScaleArea ? this.paneScaleState.secondary ?? this.volumeScaleModel.getVisibleVolumeRange(
      volumeSeries.map((series) => series.buffer),
      visibleRange
    ) : void 0;
    const rect = this.container.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const activePlotArea = getActivePlotArea(layout, pointerX, pointerY);
    if (!activePlotArea) {
      this.handlePointerLeave();
      return;
    }
    const x = clamp2(pointerX, layout.plotArea.x, layout.plotArea.x + layout.plotArea.width);
    const y = clamp2(
      pointerY,
      activePlotArea.plotArea.y,
      activePlotArea.plotArea.y + activePlotArea.plotArea.height
    );
    const dataIndex = xToIndex(x, visibleRange, layout.plotArea);
    const timestamp = getSeriesBufferTimeAt(primaryBuffer, dataIndex);
    if (timestamp === void 0) {
      return;
    }
    const activeRange = activePlotArea.kind === "secondary" && volumeRange ? volumeRange : priceRange;
    const activeValue = yToPrice(y, activeRange, activePlotArea.plotArea);
    this.crosshair = {
      x,
      y,
      priceLabel: formatPriceLabel(activeValue),
      timeLabel: formatTimeLabel(
        timestamp,
        Math.max(1, visibleRange.to - visibleRange.from + 1)
      ),
      horizontalArea: activePlotArea.plotArea,
      priceScaleArea: activePlotArea.priceScaleArea
    };
    this.crosshairMoveEmitter.emit({
      point: { x, y },
      time: timestamp,
      price: activeValue
    });
    this.render();
  }
  panFromPointer(event) {
    if (!this.dragInteraction || this.dragInteraction.type !== "horizontal-pan") {
      return;
    }
    const maxLength = this.getMaxSeriesLength();
    if (maxLength <= 0) {
      return;
    }
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const deltaX = pointerX - this.dragInteraction.lastX;
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
    this.dragInteraction = {
      ...this.dragInteraction,
      lastX: pointerX
    };
  }
  panPriceScaleFromPointer(event, pane) {
    if (!this.dragInteraction || this.dragInteraction.type !== "vertical-pan") {
      return;
    }
    const context = this.getPaneInteractionContext(pane);
    if (!context) {
      return;
    }
    const rect = this.container.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;
    const lastValue = yToPrice(
      this.dragInteraction.lastY,
      context.range,
      context.plotArea
    );
    const nextValue = yToPrice(pointerY, context.range, context.plotArea);
    const deltaPrice = lastValue - nextValue;
    this.setPaneScaleRange(pane, panPriceRange(context.range, deltaPrice));
    this.dragInteraction = {
      ...this.dragInteraction,
      lastY: pointerY
    };
  }
  getPrimaryBuffer() {
    for (const series of this.series.values()) {
      if (getSeriesBufferLength(series.buffer) > 0) {
        return series.buffer;
      }
    }
    return void 0;
  }
  getLayout() {
    const hasSecondaryPane = this.hasVolumeSeries();
    return getChartLayout(
      this.size,
      this.options.padding,
      getLayoutOptions(hasSecondaryPane)
    );
  }
  getMainSeries() {
    return Array.from(this.series.values()).filter(
      (series) => series.type !== "volume"
    );
  }
  getVolumeSeries() {
    return Array.from(this.series.values()).filter(
      (series) => series.type === "volume"
    );
  }
  hasVolumeSeries() {
    return this.getVolumeSeries().length > 0;
  }
  zoomPriceScaleAtPoint(pane, pointerY, scaleFactor) {
    const context = this.getPaneInteractionContext(pane);
    if (!context) {
      return;
    }
    const anchorPrice = yToPrice(pointerY, context.range, context.plotArea);
    this.setPaneScaleRange(
      pane,
      zoomPriceRange(context.range, anchorPrice, scaleFactor)
    );
  }
  getPaneInteractionContext(pane) {
    const layout = this.getLayout();
    const visibleRange = this.timeScaleModel.getVisibleRange(this.getMaxSeriesLength());
    if (pane === "secondary") {
      if (!layout.secondaryPlotArea) {
        return void 0;
      }
      const range2 = this.paneScaleState.secondary ?? this.volumeScaleModel.getVisibleVolumeRange(
        this.getVolumeSeries().map((series) => series.buffer),
        visibleRange
      );
      return {
        plotArea: layout.secondaryPlotArea,
        range: range2
      };
    }
    const range = this.paneScaleState.main ?? this.priceScaleModel.getVisiblePriceRange(
      this.getMainSeries().map((series) => series.buffer),
      visibleRange
    );
    return {
      plotArea: layout.plotArea,
      range
    };
  }
  setPaneScaleRange(pane, range) {
    this.paneScaleState = {
      ...this.paneScaleState,
      [pane]: range
    };
  }
  emitVisibleRangeIfChanged(visibleRange, maxLength) {
    const nextRange = maxLength > 0 ? visibleRange : void 0;
    if (areVisibleRangesEqual(this.lastEmittedVisibleRange, nextRange)) {
      return;
    }
    this.lastEmittedVisibleRange = nextRange ? { from: nextRange.from, to: nextRange.to } : void 0;
    this.visibleRangeEmitter.emit(this.lastEmittedVisibleRange);
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
function drawGrid(context, layout, options, priceScaleTicks, secondaryTicks) {
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
    context.lineTo(
      x,
      layout.secondaryPlotArea ? layout.secondaryPlotArea.y + layout.secondaryPlotArea.height : plotArea.y + plotArea.height
    );
    context.stroke();
  }
  if (layout.secondaryPlotArea) {
    if (secondaryTicks) {
      for (const tick of secondaryTicks) {
        context.beginPath();
        context.moveTo(layout.secondaryPlotArea.x, tick.y);
        context.lineTo(
          layout.secondaryPlotArea.x + layout.secondaryPlotArea.width,
          tick.y
        );
        context.stroke();
      }
    }
    context.beginPath();
    context.moveTo(layout.secondaryPlotArea.x, layout.secondaryPlotArea.y - 4);
    context.lineTo(
      layout.secondaryPlotArea.x + layout.secondaryPlotArea.width,
      layout.secondaryPlotArea.y - 4
    );
    context.stroke();
  }
}
function isPointInPlotArea(x, y, plotArea) {
  return x >= plotArea.x && x <= plotArea.x + plotArea.width && y >= plotArea.y && y <= plotArea.y + plotArea.height;
}
function getActivePlotArea(layout, x, y) {
  if (layout.secondaryPlotArea && layout.secondaryPriceScaleArea) {
    if (isPointInPlotArea(x, y, layout.secondaryPlotArea)) {
      return {
        kind: "secondary",
        plotArea: layout.secondaryPlotArea,
        priceScaleArea: layout.secondaryPriceScaleArea
      };
    }
  }
  if (isPointInPlotArea(x, y, layout.plotArea)) {
    return {
      kind: "main",
      plotArea: layout.plotArea,
      priceScaleArea: layout.priceScaleArea
    };
  }
  return void 0;
}
function getPointerTarget(layout, x, y) {
  if (isPointInPlotArea(x, y, layout.plotArea)) {
    return { region: "plot", pane: "main" };
  }
  if (isPointInPlotArea(x, y, layout.priceScaleArea)) {
    return { region: "price-scale", pane: "main" };
  }
  if (layout.secondaryPlotArea && isPointInPlotArea(x, y, layout.secondaryPlotArea)) {
    return { region: "plot", pane: "secondary" };
  }
  if (layout.secondaryPriceScaleArea && isPointInPlotArea(x, y, layout.secondaryPriceScaleArea)) {
    return { region: "price-scale", pane: "secondary" };
  }
  return void 0;
}
function areVisibleRangesEqual(left, right) {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.from === right.from && left.to === right.to;
}
function getLayoutOptions(hasSecondaryPane) {
  if (!hasSecondaryPane) {
    return {
      priceScaleWidth: PRICE_SCALE_WIDTH,
      timeScaleHeight: TIME_SCALE_HEIGHT
    };
  }
  return {
    priceScaleWidth: PRICE_SCALE_WIDTH,
    timeScaleHeight: TIME_SCALE_HEIGHT,
    secondaryPaneHeight: VOLUME_PANE_HEIGHT,
    paneGap: SECONDARY_PANE_GAP
  };
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
  update(data) {
    this.chartModel.updateSeriesData(this.seriesId, data);
  }
};
var LineSeriesApiImpl = class {
  constructor(chartModel, seriesId) {
    this.chartModel = chartModel;
    this.seriesId = seriesId;
  }
  chartModel;
  seriesId;
  setData(data) {
    this.chartModel.setLineSeriesData(this.seriesId, data);
  }
  update(data) {
    this.chartModel.updateLineSeriesData(this.seriesId, data);
  }
};
var VolumeSeriesApiImpl = class {
  constructor(chartModel, seriesId) {
    this.chartModel = chartModel;
    this.seriesId = seriesId;
  }
  chartModel;
  seriesId;
  setData(data) {
    this.chartModel.setVolumeSeriesData(this.seriesId, data);
  }
  update(data) {
    this.chartModel.updateVolumeSeriesData(this.seriesId, data);
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
    if (type === "candlestick") {
      const seriesId2 = this.chartModel.addCandlestickSeries(
        options
      );
      const api2 = new CandlestickSeriesApiImpl(this.chartModel, seriesId2);
      this.seriesApiIds.set(api2, seriesId2);
      return api2;
    }
    if (type === "volume") {
      const seriesId2 = this.chartModel.addVolumeSeries(
        options
      );
      const api2 = new VolumeSeriesApiImpl(this.chartModel, seriesId2);
      this.seriesApiIds.set(api2, seriesId2);
      return api2;
    }
    const seriesId = this.chartModel.addLineSeries(
      options
    );
    const api = new LineSeriesApiImpl(this.chartModel, seriesId);
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
  subscribeCrosshairMove(handler) {
    return this.chartModel.subscribeCrosshairMove(handler);
  }
  subscribeVisibleRangeChange(handler) {
    return this.chartModel.subscribeVisibleRangeChange(handler);
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
export {
  createChart
};
