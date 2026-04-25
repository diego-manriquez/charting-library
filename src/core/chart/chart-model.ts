import { resolveChartOptions } from "./chart-options";
import { PriceScaleModel } from "../scales/price-scale";
import { TimeScaleModel } from "../scales/time-scale";
import { CanvasLayerManager } from "../../rendering/canvas/canvas-layer-manager";
import { getPlotArea } from "../../rendering/common/geometry";
import { renderCandlesticks, resolveSeriesOptions } from "../../rendering/renderers/candlestick-renderer";
import { createCandleBuffer } from "../../data/adapters/candle-data-adapter";
import type {
  CandlestickData,
  CandlestickSeriesOptions,
  ChartOptions,
} from "../../public-api/types";
import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { ResolvedChartOptions } from "./chart-options";
import type { Size } from "../../rendering/common/geometry";

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
  private resizeObserver: ResizeObserver | undefined;

  constructor(
    private readonly container: HTMLElement,
    options: ChartOptions | undefined,
  ) {
    this.options = resolveChartOptions(options);
    this.layerManager = new CanvasLayerManager(container);
    this.size = this.resolveInitialSize();
    this.applyContainerStyles();
    this.layerManager.resize(this.size);
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
    const plotArea = getPlotArea(this.size, this.options.padding);

    this.layerManager.clear();
    drawBackground(context, this.size, this.options.backgroundColor);
    drawGrid(context, plotArea, this.options);

    const buffers = Array.from(this.series.values(), (series) => series.buffer);
    const maxLength = this.getMaxSeriesLength();
    const visibleRange = this.timeScaleModel.getVisibleRange(maxLength);
    const priceRange = this.priceScaleModel.getVisiblePriceRange(
      buffers,
      visibleRange,
    );

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
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
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
  plotArea: ReturnType<typeof getPlotArea>,
  options: ResolvedChartOptions,
): void {
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
