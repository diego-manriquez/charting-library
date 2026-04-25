import { resolveChartOptions } from "./chart-options";
import {
  panPriceRange,
  PriceScaleModel,
  type PriceRange,
  zoomPriceRange,
} from "../scales/price-scale";
import { TimeScaleModel } from "../scales/time-scale";
import { VolumeScaleModel } from "../scales/volume-scale";
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
  renderLineSeries,
  resolveLineSeriesOptions,
} from "../../rendering/renderers/line-renderer";
import {
  renderVolumeSeries,
  resolveVolumeSeriesOptions,
} from "../../rendering/renderers/volume-renderer";
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
import {
  createLineBuffer,
  updateLineBuffer,
} from "../../data/adapters/line-data-adapter";
import {
  createVolumeBuffer,
  updateVolumeBuffer,
} from "../../data/adapters/volume-data-adapter";
import type {
  CandlestickData,
  CandlestickSeriesOptions,
  ChartOptions,
  LineData,
  LineSeriesOptions,
  VolumeData,
  VolumeSeriesOptions,
} from "../../public-api/types";
import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { LineBuffer } from "../../data/buffers/line-buffer";
import type { VolumeBuffer } from "../../data/buffers/volume-buffer";
import type { ResolvedChartOptions } from "./chart-options";
import type { ChartLayout, Size } from "../../rendering/common/geometry";
import {
  getSeriesBufferLength,
  getSeriesBufferTimeAt,
  type SeriesDataBuffer,
} from "../series/series-types";
import { EventEmitter } from "../events/event-emitter";
import type {
  CrosshairMoveEvent,
  VisibleRange,
} from "../../public-api/types";

const PRICE_SCALE_WIDTH = 72;
const TIME_SCALE_HEIGHT = 28;
const AXIS_BACKGROUND = "#0f172a";
const CROSSHAIR_LINE_COLOR = "rgba(226, 232, 240, 0.65)";
const CROSSHAIR_LABEL_COLOR = "#1d4ed8";
const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1.15;
const SECONDARY_PANE_GAP = 8;
const VOLUME_PANE_HEIGHT = 104;
const VERTICAL_ZOOM_IN_FACTOR = 0.9;
const VERTICAL_ZOOM_OUT_FACTOR = 1.1;

interface CandlestickSeriesState {
  id: number;
  type: "candlestick";
  options: Required<CandlestickSeriesOptions>;
  buffer: CandleBuffer;
}

interface LineSeriesState {
  id: number;
  type: "line";
  options: Required<LineSeriesOptions>;
  buffer: LineBuffer;
}

interface VolumeSeriesState {
  id: number;
  type: "volume";
  options: Required<VolumeSeriesOptions>;
  buffer: VolumeBuffer;
}

type SeriesState = CandlestickSeriesState | LineSeriesState | VolumeSeriesState;

type PaneKind = "main" | "secondary";

interface PaneScaleState {
  main: PriceRange | undefined;
  secondary: PriceRange | undefined;
}

type DragInteraction =
  | {
      type: "horizontal-pan";
      pointerId: number;
      lastX: number;
    }
  | {
      type: "vertical-pan";
      pointerId: number;
      pane: PaneKind;
      lastY: number;
    };

export class ChartModel {
  private readonly options: ResolvedChartOptions;
  private readonly timeScaleModel = new TimeScaleModel();
  private readonly priceScaleModel = new PriceScaleModel();
  private readonly volumeScaleModel = new VolumeScaleModel();
  private readonly layerManager: CanvasLayerManager;
  private readonly series = new Map<number, SeriesState>();
  private readonly crosshairMoveEmitter = new EventEmitter<CrosshairMoveEvent>();
  private readonly visibleRangeEmitter = new EventEmitter<VisibleRange | undefined>();
  private nextSeriesId = 1;
  private size: Size;
  private crosshair: CrosshairState | undefined;
  private lastEmittedVisibleRange: VisibleRange | undefined;
  private paneScaleState: PaneScaleState = {
    main: undefined,
    secondary: undefined,
  };
  private dragInteraction: DragInteraction | undefined;
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
    if (this.dragInteraction) {
      return;
    }

    if (!this.crosshair) {
      return;
    }

    this.crosshair = undefined;
    this.crosshairMoveEmitter.emit({
      point: undefined,
      time: undefined,
      price: undefined,
    });
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
      type: "candlestick",
      options: resolveSeriesOptions(options),
      buffer: createCandleBuffer([]),
    });

    this.render();
    return id;
  }

  addLineSeries(options: LineSeriesOptions | undefined): number {
    const id = this.nextSeriesId;
    this.nextSeriesId += 1;

    this.series.set(id, {
      id,
      type: "line",
      options: resolveLineSeriesOptions(options),
      buffer: createLineBuffer([]),
    });

    this.render();
    return id;
  }

  addVolumeSeries(options: VolumeSeriesOptions | undefined): number {
    const id = this.nextSeriesId;
    this.nextSeriesId += 1;

    this.series.set(id, {
      id,
      type: "volume",
      options: resolveVolumeSeriesOptions(options),
      buffer: createVolumeBuffer([]),
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

    if (!series || series.type !== "candlestick") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    series.buffer = createCandleBuffer(data);
    this.fitContent();
    this.render();
  }

  updateSeriesData(seriesId: number, data: CandlestickData): void {
    const series = this.series.get(seriesId);

    if (!series || series.type !== "candlestick") {
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

  setLineSeriesData(seriesId: number, data: LineData[]): void {
    const series = this.series.get(seriesId);

    if (!series || series.type !== "line") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    series.buffer = createLineBuffer(data);
    this.fitContent();
    this.render();
  }

  updateLineSeriesData(seriesId: number, data: LineData): void {
    const series = this.series.get(seriesId);

    if (!series || series.type !== "line") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    const previousLength = series.buffer.length;
    const wasFollowingLatest =
      this.timeScaleModel.isRightEdgeVisible(previousLength);

    series.buffer = updateLineBuffer(series.buffer, data);

    if (previousLength === 0) {
      this.fitContent();
    } else if (series.buffer.length > previousLength && wasFollowingLatest) {
      this.timeScaleModel.pan(series.buffer.length, 1);
    }

    this.render();
  }

  setVolumeSeriesData(seriesId: number, data: VolumeData[]): void {
    const series = this.series.get(seriesId);

    if (!series || series.type !== "volume") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    series.buffer = createVolumeBuffer(data);
    this.fitContent();
    this.render();
  }

  updateVolumeSeriesData(seriesId: number, data: VolumeData): void {
    const series = this.series.get(seriesId);

    if (!series || series.type !== "volume") {
      throw new Error(`Series ${seriesId} does not exist.`);
    }

    const previousLength = series.buffer.length;
    const wasFollowingLatest =
      this.timeScaleModel.isRightEdgeVisible(previousLength);

    series.buffer = updateVolumeBuffer(series.buffer, data);

    if (previousLength === 0) {
      this.fitContent();
    } else if (series.buffer.length > previousLength && wasFollowingLatest) {
      this.timeScaleModel.pan(series.buffer.length, 1);
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

  subscribeCrosshairMove(
    handler: (event: CrosshairMoveEvent) => void,
  ): () => void {
    return this.crosshairMoveEmitter.subscribe(handler);
  }

  subscribeVisibleRangeChange(
    handler: (range: VisibleRange | undefined) => void,
  ): () => void {
    return this.visibleRangeEmitter.subscribe(handler);
  }

  render(): void {
    const hasSecondaryPane = this.hasVolumeSeries();
    const context = this.layerManager.getContext();
    const layout = getChartLayout(
      this.size,
      this.options.padding,
      getLayoutOptions(hasSecondaryPane),
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
      visibleRange,
    );
    const priceRange = this.paneScaleState.main ?? autoPriceRange;
    const volumeRange =
      layout.secondaryPlotArea && layout.secondaryPriceScaleArea
        ? this.paneScaleState.secondary ??
          this.volumeScaleModel.getVisibleVolumeRange(
            volumeSeries.map((series) => series.buffer),
            visibleRange,
          )
        : undefined;
    const priceScaleTicks = getPriceScaleTicks(
      priceRange,
      plotArea,
      this.options.grid.horizontalLines + 1,
    );
    const volumeScaleTicks =
      volumeRange && layout.secondaryPlotArea
        ? getPriceScaleTicks(volumeRange, layout.secondaryPlotArea, 3)
        : undefined;

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
          plotArea,
        });
        continue;
      }

      renderLineSeries({
        context,
        buffer: series.buffer,
        options: series.options,
        visibleRange,
        priceRange,
        plotArea,
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
          plotArea: layout.secondaryPlotArea,
        });
      }
    }

    renderPriceScale({
      context,
      area: layout.priceScaleArea,
      textColor: this.options.textColor,
      borderColor: this.options.grid.color,
      backgroundColor: AXIS_BACKGROUND,
      ticks: priceScaleTicks,
    });

    if (
      layout.secondaryPriceScaleArea &&
      volumeScaleTicks
    ) {
      renderPriceScale({
        context,
        area: layout.secondaryPriceScaleArea,
        textColor: this.options.textColor,
        borderColor: this.options.grid.color,
        backgroundColor: AXIS_BACKGROUND,
        ticks: volumeScaleTicks,
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
      tickCount: this.options.grid.verticalLines + 1,
    });

    this.emitVisibleRangeIfChanged(visibleRange, maxLength);

    if (this.crosshair) {
      renderCrosshair({
        context,
        plotAreas: layout.secondaryPlotArea
          ? [layout.plotArea, layout.secondaryPlotArea]
          : [layout.plotArea],
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
    this.crosshairMoveEmitter.clear();
    this.visibleRangeEmitter.clear();
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
      maxLength = Math.max(maxLength, getSeriesBufferLength(series.buffer));
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
    if (this.dragInteraction?.pointerId === event.pointerId) {
      if (this.dragInteraction.type === "horizontal-pan") {
        this.panFromPointer(event);
      } else {
        this.panPriceScaleFromPointer(event, this.dragInteraction.pane);
      }
    }

    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }

  private handlePointerDownEvent(event: PointerEvent): void {
    const layout = this.getLayout();
    const rect = this.container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const target = getPointerTarget(layout, pointerX, pointerY);

    if (!target) {
      return;
    }

    this.dragInteraction =
      target.region === "plot"
        ? {
            type: "horizontal-pan",
            pointerId: event.pointerId,
            lastX: pointerX,
          }
        : {
            type: "vertical-pan",
            pointerId: event.pointerId,
            pane: target.pane,
            lastY: pointerY,
          };
    this.container.setPointerCapture?.(event.pointerId);
    this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
  }

  private handlePointerUpEvent(event: PointerEvent): void {
    if (this.dragInteraction?.pointerId !== event.pointerId) {
      return;
    }

    this.dragInteraction = undefined;
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
    const target = getPointerTarget(layout, pointerX, pointerY);

    if (!target) {
      return;
    }

    event.preventDefault();

    if (target.region === "price-scale") {
      this.zoomPriceScaleAtPoint(
        target.pane,
        pointerY,
        event.deltaY < 0 ? VERTICAL_ZOOM_IN_FACTOR : VERTICAL_ZOOM_OUT_FACTOR,
      );
      this.updateCrosshairFromClientPoint(event.clientX, event.clientY);
      return;
    }

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
    const mainSeries = this.getMainSeries();
    const volumeSeries = this.getVolumeSeries();
    const autoPriceRange = this.priceScaleModel.getVisiblePriceRange(
      mainSeries.map((series) => series.buffer),
      visibleRange,
    );
    const priceRange = this.paneScaleState.main ?? autoPriceRange;
    const layout = this.getLayout();
    const volumeRange =
      layout.secondaryPlotArea && layout.secondaryPriceScaleArea
        ? this.paneScaleState.secondary ??
          this.volumeScaleModel.getVisibleVolumeRange(
            volumeSeries.map((series) => series.buffer),
            visibleRange,
          )
        : undefined;
    const rect = this.container.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const activePlotArea = getActivePlotArea(layout, pointerX, pointerY);

    if (!activePlotArea) {
      this.handlePointerLeave();
      return;
    }

    const x = clamp(pointerX, layout.plotArea.x, layout.plotArea.x + layout.plotArea.width);
    const y = clamp(
      pointerY,
      activePlotArea.plotArea.y,
      activePlotArea.plotArea.y + activePlotArea.plotArea.height,
    );
    const dataIndex = xToIndex(x, visibleRange, layout.plotArea);
    const timestamp = getSeriesBufferTimeAt(primaryBuffer, dataIndex);

    if (timestamp === undefined) {
      return;
    }

    const activeRange =
      activePlotArea.kind === "secondary" && volumeRange
        ? volumeRange
        : priceRange;
    const activeValue = yToPrice(y, activeRange, activePlotArea.plotArea);

    this.crosshair = {
      x,
      y,
      priceLabel: formatPriceLabel(activeValue),
      timeLabel: formatTimeLabel(
        timestamp,
        Math.max(1, visibleRange.to - visibleRange.from + 1),
      ),
      horizontalArea: activePlotArea.plotArea,
      priceScaleArea: activePlotArea.priceScaleArea,
    };
    this.crosshairMoveEmitter.emit({
      point: { x, y },
      time: timestamp,
      price: activeValue,
    });

    this.render();
  }

  private panFromPointer(event: PointerEvent): void {
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
      lastX: pointerX,
    };
  }

  private panPriceScaleFromPointer(
    event: PointerEvent,
    pane: PaneKind,
  ): void {
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
      context.plotArea,
    );
    const nextValue = yToPrice(pointerY, context.range, context.plotArea);
    const deltaPrice = lastValue - nextValue;

    this.setPaneScaleRange(pane, panPriceRange(context.range, deltaPrice));
    this.dragInteraction = {
      ...this.dragInteraction,
      lastY: pointerY,
    };
  }

  private getPrimaryBuffer(): SeriesDataBuffer | undefined {
    for (const series of this.series.values()) {
      if (getSeriesBufferLength(series.buffer) > 0) {
        return series.buffer;
      }
    }

    return undefined;
  }

  private getLayout(): ChartLayout {
    const hasSecondaryPane = this.hasVolumeSeries();

    return getChartLayout(
      this.size,
      this.options.padding,
      getLayoutOptions(hasSecondaryPane),
    );
  }

  private getMainSeries(): Array<CandlestickSeriesState | LineSeriesState> {
    return Array.from(this.series.values()).filter(
      (series): series is CandlestickSeriesState | LineSeriesState =>
        series.type !== "volume",
    );
  }

  private getVolumeSeries(): VolumeSeriesState[] {
    return Array.from(this.series.values()).filter(
      (series): series is VolumeSeriesState => series.type === "volume",
    );
  }

  private hasVolumeSeries(): boolean {
    return this.getVolumeSeries().length > 0;
  }

  private zoomPriceScaleAtPoint(
    pane: PaneKind,
    pointerY: number,
    scaleFactor: number,
  ): void {
    const context = this.getPaneInteractionContext(pane);

    if (!context) {
      return;
    }

    const anchorPrice = yToPrice(pointerY, context.range, context.plotArea);
    this.setPaneScaleRange(
      pane,
      zoomPriceRange(context.range, anchorPrice, scaleFactor),
    );
  }

  private getPaneInteractionContext(
    pane: PaneKind,
  ): { plotArea: ChartLayout["plotArea"]; range: PriceRange } | undefined {
    const layout = this.getLayout();
    const visibleRange = this.timeScaleModel.getVisibleRange(this.getMaxSeriesLength());

    if (pane === "secondary") {
      if (!layout.secondaryPlotArea) {
        return undefined;
      }

      const range =
        this.paneScaleState.secondary ??
        this.volumeScaleModel.getVisibleVolumeRange(
          this.getVolumeSeries().map((series) => series.buffer),
          visibleRange,
        );

      return {
        plotArea: layout.secondaryPlotArea,
        range,
      };
    }

    const range =
      this.paneScaleState.main ??
      this.priceScaleModel.getVisiblePriceRange(
        this.getMainSeries().map((series) => series.buffer),
        visibleRange,
      );

    return {
      plotArea: layout.plotArea,
      range,
    };
  }

  private setPaneScaleRange(pane: PaneKind, range: PriceRange): void {
    this.paneScaleState = {
      ...this.paneScaleState,
      [pane]: range,
    };
  }

  private emitVisibleRangeIfChanged(
    visibleRange: VisibleRange,
    maxLength: number,
  ): void {
    const nextRange = maxLength > 0 ? visibleRange : undefined;

    if (areVisibleRangesEqual(this.lastEmittedVisibleRange, nextRange)) {
      return;
    }

    this.lastEmittedVisibleRange = nextRange
      ? { from: nextRange.from, to: nextRange.to }
      : undefined;
    this.visibleRangeEmitter.emit(this.lastEmittedVisibleRange);
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
  secondaryTicks?: PriceScaleTick[],
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
    context.lineTo(
      x,
      layout.secondaryPlotArea
        ? layout.secondaryPlotArea.y + layout.secondaryPlotArea.height
        : plotArea.y + plotArea.height,
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
          tick.y,
        );
        context.stroke();
      }
    }

    context.beginPath();
    context.moveTo(layout.secondaryPlotArea.x, layout.secondaryPlotArea.y - 4);
    context.lineTo(
      layout.secondaryPlotArea.x + layout.secondaryPlotArea.width,
      layout.secondaryPlotArea.y - 4,
    );
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

function getActivePlotArea(
  layout: ChartLayout,
  x: number,
  y: number,
): {
  kind: "main" | "secondary";
  plotArea: ChartLayout["plotArea"];
  priceScaleArea: ChartLayout["priceScaleArea"];
} | undefined {
  if (layout.secondaryPlotArea && layout.secondaryPriceScaleArea) {
    if (isPointInPlotArea(x, y, layout.secondaryPlotArea)) {
      return {
        kind: "secondary",
        plotArea: layout.secondaryPlotArea,
        priceScaleArea: layout.secondaryPriceScaleArea,
      };
    }
  }

  if (isPointInPlotArea(x, y, layout.plotArea)) {
    return {
      kind: "main",
      plotArea: layout.plotArea,
      priceScaleArea: layout.priceScaleArea,
    };
  }

  return undefined;
}

function getPointerTarget(
  layout: ChartLayout,
  x: number,
  y: number,
): { region: "plot" | "price-scale"; pane: PaneKind } | undefined {
  if (isPointInPlotArea(x, y, layout.plotArea)) {
    return { region: "plot", pane: "main" };
  }

  if (isPointInPlotArea(x, y, layout.priceScaleArea)) {
    return { region: "price-scale", pane: "main" };
  }

  if (layout.secondaryPlotArea && isPointInPlotArea(x, y, layout.secondaryPlotArea)) {
    return { region: "plot", pane: "secondary" };
  }

  if (
    layout.secondaryPriceScaleArea &&
    isPointInPlotArea(x, y, layout.secondaryPriceScaleArea)
  ) {
    return { region: "price-scale", pane: "secondary" };
  }

  return undefined;
}

function areVisibleRangesEqual(
  left: VisibleRange | undefined,
  right: VisibleRange | undefined,
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.from === right.from && left.to === right.to;
}

function getLayoutOptions(hasSecondaryPane: boolean): {
  priceScaleWidth: number;
  timeScaleHeight: number;
  secondaryPaneHeight?: number;
  paneGap?: number;
} {
  if (!hasSecondaryPane) {
    return {
      priceScaleWidth: PRICE_SCALE_WIDTH,
      timeScaleHeight: TIME_SCALE_HEIGHT,
    };
  }

  return {
    priceScaleWidth: PRICE_SCALE_WIDTH,
    timeScaleHeight: TIME_SCALE_HEIGHT,
    secondaryPaneHeight: VOLUME_PANE_HEIGHT,
    paneGap: SECONDARY_PANE_GAP,
  };
}
