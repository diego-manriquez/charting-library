import { resolveChartOptions } from "./chart-options";
import { PriceScaleModel } from "../scales/price-scale";
import { TimeScaleModel } from "../scales/time-scale";
import { CanvasLayerManager } from "../../rendering/canvas/canvas-layer-manager";
import {
  clamp,
  formatPriceLabel,
  formatTimeLabel,
  xToIndex,
  yToPrice,
} from "../../rendering/common/chart-coordinates";
import { getChartLayout } from "../../rendering/common/geometry";
import { renderCrosshair, type CrosshairState } from "../../rendering/renderers/crosshair-renderer";
import { renderCandlesticks, resolveSeriesOptions } from "../../rendering/renderers/candlestick-renderer";
import {
  getPriceScaleTicks,
  renderPriceScale,
  type PriceScaleTick,
} from "../../rendering/renderers/price-scale-renderer";
import { renderTimeScale } from "../../rendering/renderers/time-scale-renderer";
import {
  createCandleBuffer,
  updateCandleBuffer,
} from "../../data/adapters/candle-data-adapter";
import type {
  CandlestickData,
  CandlestickSeriesOptions,
  ChartOptions,
} from "../../public-api/types";
import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { ResolvedChartOptions } from "./chart-options";
import type { ChartLayout, Size } from "../../rendering/common/geometry";

const PRICE_SCALE_WIDTH = 72;
const TIME_SCALE_HEIGHT = 28;
const AXIS_BACKGROUND = "#0f172a";
const CROSSHAIR_LINE_COLOR = "rgba(226, 232, 240, 0.65)";
const CROSSHAIR_LABEL_COLOR = "#1d4ed8";
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1.15;

interface CandlestickSeriesState {
  id: number;
  options: Required<CandlestickSeriesOptions>;
  buffer: CandleBuffer;
}

export class ChartModel {
  private readonly options: ResolvedChartOptions;
  private readonly timeScaleModel = new TimeScaleModel();
  private readonly priceScaleModel = new PriceScaleModel();
  private readonly layerManager: CanvasLayerManager;
  private readonly series = new Map<number, CandlestickSeriesState>();
  private nextSeriesId = 1;
  private size: Size;
  private crosshair: CrosshairState | undefined;
  private activePointerId: number | undefined;
  private lastPanX: number | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.handlePointerMoveEvent(event);
  };
  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.handlePointerDownEvent(event);
  };
  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.handlePointerUpEvent(event);
  };
  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.handlePointerUpEvent(event);
  };
  private readonly handlePointerLeave = (): void => {
    if (this.activePointerId !== undefined) {
      return;
    }

    if (!this.crosshair) {
      return;
    }

    this.crosshair = undefined;
    this.render();
  };
  private readonly handleWheel = (event: WheelEvent): void => {
    this.handleWheelEvent(event);
  };

  constructor(
    private readonly container: HTMLElement,
    options: ChartOptions | undefined,
  ) {
    this.options = resolveChartOptions(options);
    this.layerManager = new CanvasLayerManager(container);
    this.size = this.resolveInitialSize();
    this.applyContainerStyles();
    this.layerManager.resize(this.size);
    this.bindPointerEvents();
    this.bindContainerResize();
    this.render();
  }

  addCandlestickSeries(
    options: CandlestickSeriesOptions | undefined,
  ): number {
    const id = this.nextSeriesId;
    this.nextSeriesId += 1;

    this.series.set(id, {
      id,
      options: resolveSeriesOptions(options),
      buffer: createCandleBuffer([]),
    });

    this.render();
    return id;
  }

  removeSeries(seriesId: number): void {
    this.series.delete(seriesId);
    this.fitContent();
    this.render();
  }

  setSeriesData(seriesId: number, data: CandlestickData[]): void {
    const series = this.series.get(seriesId);

    if (!series) {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    series.buffer = createCandleBuffer(data);
    this.fitContent();
    this.render();
  }

  updateSeriesData(seriesId: number, data: CandlestickData): void {
    const series = this.series.get(seriesId);

    if (!series) {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    const previousLength = series.buffer.length;
    const wasFollowingLatest = this.timeScaleModel.isRightEdgeVisible(previousLength);
    const lastTimestamp =
      previousLength > 0 ? series.buffer.time[previousLength - 1] : undefined;

    series.buffer = updateCandleBuffer(series.buffer, data);

    if (previousLength === 0) {
      this.fitContent();
    } else if (series.buffer.length > previousLength && wasFollowingLatest) {
      this.timeScaleModel.pan(series.buffer.length, 1);
    }

    if (lastTimestamp === undefined || data.time !== lastTimestamp) {
      this.render();
      return;
    }

    this.render();
  }

  fitContent(): void {
    const maxLength = this.getMaxSeriesLength();
    this.timeScaleModel.fitContent(maxLength);
  }

  resize(width: number, height: number): void {
    this.size = {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
    this.layerManager.resize(this.size);
    this.render();
  }

  render(): void {
    const context = this.layerManager.getContext();
    const layout = getChartLayout(this.size, this.options.padding, {
      priceScaleWidth: PRICE_SCALE_WIDTH,
      timeScaleHeight: TIME_SCALE_HEIGHT,
    });
    const plotArea = layout.plotArea;

    const buffers = Array.from(this.series.values(), (series) => series.buffer);
    const primaryBuffer = buffers.find((buffer) => buffer.length > 0);
    const maxLength = this.getMaxSeriesLength();
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const priceRange = this.priceScaleModel.getVisiblePriceRange(
      buffers,
      visibleRange,
    );
    const priceScaleTicks = getPriceScaleTicks(
      priceRange,
      plotArea,
      this.options.grid.horizontalLines + 1,
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
        plotArea,
      });
    }

    renderPriceScale({
      context,
      area: layout.priceScaleArea,
      textColor: this.options.textColor,
      borderColor: this.options.grid.color,
      backgroundColor: AXIS_BACKGROUND,
      ticks: priceScaleTicks,
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
      tickCount: this.options.grid.verticalLines + 1,
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
        accentColor: CROSSHAIR_LABEL_COLOR,
      });
    }
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.unbindPointerEvents();
    this.series.clear();
    this.layerManager.dispose();
  }

  private resolveInitialSize(): Size {
    const measuredSize = measureElementSize(this.container);

    return {
      width: Math.max(
        1,
        this.options.width ?? measuredSize.width,
      ),
      height: Math.max(
        1,
        this.options.height ?? measuredSize.height,
      ),
    };
  }

  private getMaxSeriesLength(): number {
    let maxLength = 0;

    for (const series of this.series.values()) {
      maxLength = Math.max(maxLength, series.buffer.length);
    }

    return maxLength;
  }

  private applyContainerStyles(): void {
    if (!this.container.style.position) {
      this.container.style.position = "relative";
    }
  }

  private bindContainerResize(): void {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.options.width !== undefined && this.options.height !== undefined) {
          return;
        }

        const nextSize = this.resolveInitialSize();

        if (
          nextSize.width === this.size.width &&
          nextSize.height === this.size.height
        ) {
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

      if (
        nextSize.width === this.size.width &&
        nextSize.height === this.size.height
      ) {
        return;
      }

      this.resize(nextSize.width, nextSize.height);
    });
  }

  private bindPointerEvents(): void {
    this.container.addEventListener("pointerdown", this.handlePointerDown);
    this.container.addEventListener("pointermove", this.handlePointerMove);
    this.container.addEventListener("pointerup", this.handlePointerUp);
    this.container.addEventListener("pointercancel", this.handlePointerCancel);
    this.container.addEventListener("pointerleave", this.handlePointerLeave);
    this.container.addEventListener("wheel", this.handleWheel, {
      passive: false,
    });
  }

  private unbindPointerEvents(): void {
    this.container.removeEventListener("pointerdown", this.handlePointerDown);
    this.container.removeEventListener("pointermove", this.handlePointerMove);
    this.container.removeEventListener("pointerup", this.handlePointerUp);
    this.container.removeEventListener("pointercancel", this.handlePointerCancel);
    this.container.removeEventListener("pointerleave", this.handlePointerLeave);
    this.container.removeEventListener("wheel", this.handleWheel);
  }

  private handlePointerMoveEvent(event: PointerEvent): void {
    if (this.activePointerId === event.pointerId && this.lastPanX !== undefined) {
      this.panFromPointer(event);
    }

    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }

  private handlePointerDownEvent(event: PointerEvent): void {
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

  private handlePointerUpEvent(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.activePointerId = undefined;
    this.lastPanX = undefined;
    this.container.releasePointerCapture?.(event.pointerId);
  }

  private handleWheelEvent(event: WheelEvent): void {
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

    const anchorRatio =
      layout.plotArea.width <= 0
        ? 0.5
        : (pointerX - layout.plotArea.x) / layout.plotArea.width;
    const scaleFactor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;

    this.timeScaleModel.zoom(maxLength, anchorRatio, scaleFactor);
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }

  private updateCrosshairFromClientPoint(clientX: number, clientY: number): void {
    const primaryBuffer = this.getPrimaryBuffer();
    const maxLength = this.getMaxSeriesLength();

    if (!primaryBuffer || maxLength === 0) {
      this.handlePointerLeave();
      return;
    }

    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const priceRange = this.priceScaleModel.getVisiblePriceRange(
      Array.from(this.series.values(), (series) => series.buffer),
      visibleRange,
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

    const x = clamp(pointerX, plotArea.x, plotArea.x + plotArea.width);
    const y = clamp(pointerY, plotArea.y, plotArea.y + plotArea.height);
    const dataIndex = xToIndex(x, visibleRange, plotArea);
    const timestamp = primaryBuffer.time[dataIndex];

    if (timestamp === undefined) {
      return;
    }

    this.crosshair = {
      x,
      y,
      priceLabel: formatPriceLabel(yToPrice(y, priceRange, plotArea)),
      timeLabel: formatTimeLabel(
        timestamp,
        Math.max(1, visibleRange.to - visibleRange.from + 1),
      ),
    };

    this.render();
  }

  private panFromPointer(event: PointerEvent): void {
    if (this.lastPanX === undefined) {
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

  private getPrimaryBuffer(): CandleBuffer | undefined {
    for (const series of this.series.values()) {
      if (series.buffer.length > 0) {
        return series.buffer;
      }
    }

    return undefined;
  }

  private getLayout(): ChartLayout {
    return getChartLayout(this.size, this.options.padding, {
      priceScaleWidth: PRICE_SCALE_WIDTH,
      timeScaleHeight: TIME_SCALE_HEIGHT,
    });
  }
}

function measureElementSize(element: HTMLElement): Size {
  const rect = element.getBoundingClientRect();

  return {
    width: Math.max(element.clientWidth, Math.round(rect.width), 0),
    height: Math.max(element.clientHeight, Math.round(rect.height), 0),
  };
}

function drawBackground(
  context: CanvasRenderingContext2D,
  size: Size,
  color: string,
): void {
  context.fillStyle = color;
  context.fillRect(0, 0, size.width, size.height);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  layout: ChartLayout,
  options: ResolvedChartOptions,
  priceScaleTicks?: PriceScaleTick[],
): void {
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

function isPointInPlotArea(x: number, y: number, plotArea: ChartLayout["plotArea"]): boolean {
  return (
    x >= plotArea.x &&
    x <= plotArea.x + plotArea.width &&
    y >= plotArea.y &&
    y <= plotArea.y + plotArea.height
  );
}
