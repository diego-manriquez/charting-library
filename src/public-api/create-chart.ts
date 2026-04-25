import { ChartModel } from "../core/chart/chart-model";
import type {
  CandlestickData,
  CandlestickSeriesApi,
  CandlestickSeriesOptions,
  ChartApi,
  ChartOptions,
  CrosshairMoveEvent,
  LineData,
  LineSeriesApi,
  LineSeriesOptions,
  SeriesType,
  TimeScaleApi,
  Unsubscribe,
  VisibleRange,
  VolumeData,
  VolumeSeriesApi,
  VolumeSeriesOptions,
} from "./types";

class CandlestickSeriesApiImpl implements CandlestickSeriesApi {
  constructor(
    private readonly chartModel: ChartModel,
    private readonly seriesId: number,
  ) {}

  setData(data: CandlestickData[]): void {
    this.chartModel.setSeriesData(this.seriesId, data);
  }

  update(data: CandlestickData): void {
    this.chartModel.updateSeriesData(this.seriesId, data);
  }
}

class LineSeriesApiImpl implements LineSeriesApi {
  constructor(
    private readonly chartModel: ChartModel,
    private readonly seriesId: number,
  ) {}

  setData(data: LineData[]): void {
    this.chartModel.setLineSeriesData(this.seriesId, data);
  }

  update(data: LineData): void {
    this.chartModel.updateLineSeriesData(this.seriesId, data);
  }
}

class VolumeSeriesApiImpl implements VolumeSeriesApi {
  constructor(
    private readonly chartModel: ChartModel,
    private readonly seriesId: number,
  ) {}

  setData(data: VolumeData[]): void {
    this.chartModel.setVolumeSeriesData(this.seriesId, data);
  }

  update(data: VolumeData): void {
    this.chartModel.updateVolumeSeriesData(this.seriesId, data);
  }
}

class TimeScaleApiImpl implements TimeScaleApi {
  constructor(private readonly chartModel: ChartModel) {}

  fitContent(): void {
    this.chartModel.fitContent();
    this.chartModel.render();
  }
}

class ChartApiImpl implements ChartApi {
  private readonly timeScaleApi: TimeScaleApi;
  private readonly seriesApiIds = new WeakMap<
    CandlestickSeriesApi | LineSeriesApi | VolumeSeriesApi,
    number
  >();

  constructor(private readonly chartModel: ChartModel) {
    this.timeScaleApi = new TimeScaleApiImpl(chartModel);
  }

  addSeries(
    type: "candlestick",
    options?: CandlestickSeriesOptions,
  ): CandlestickSeriesApi;
  addSeries(
    type: "line",
    options?: LineSeriesOptions,
  ): LineSeriesApi;
  addSeries(
    type: "volume",
    options?: VolumeSeriesOptions,
  ): VolumeSeriesApi;
  addSeries(
    type: SeriesType,
    options?:
      | CandlestickSeriesOptions
      | LineSeriesOptions
      | VolumeSeriesOptions,
  ): CandlestickSeriesApi | LineSeriesApi | VolumeSeriesApi {
    if (type === "candlestick") {
      const seriesId = this.chartModel.addCandlestickSeries(
        options as CandlestickSeriesOptions | undefined,
      );
      const api = new CandlestickSeriesApiImpl(this.chartModel, seriesId);
      this.seriesApiIds.set(api, seriesId);

      return api;
    }

    if (type === "volume") {
      const seriesId = this.chartModel.addVolumeSeries(
        options as VolumeSeriesOptions | undefined,
      );
      const api = new VolumeSeriesApiImpl(this.chartModel, seriesId);
      this.seriesApiIds.set(api, seriesId);

      return api;
    }

    const seriesId = this.chartModel.addLineSeries(
      options as LineSeriesOptions | undefined,
    );
    const api = new LineSeriesApiImpl(this.chartModel, seriesId);
    this.seriesApiIds.set(api, seriesId);

    return api;
  }

  removeSeries(
    series: CandlestickSeriesApi | LineSeriesApi | VolumeSeriesApi,
  ): void {
    const seriesId = this.seriesApiIds.get(series);

    if (seriesId === undefined) {
      return;
    }

    this.chartModel.removeSeries(seriesId);
    this.seriesApiIds.delete(series);
  }

  resize(width: number, height: number): void {
    this.chartModel.resize(width, height);
  }

  subscribeCrosshairMove(
    handler: (event: CrosshairMoveEvent) => void,
  ): Unsubscribe {
    return this.chartModel.subscribeCrosshairMove(handler);
  }

  subscribeVisibleRangeChange(
    handler: (range: VisibleRange | undefined) => void,
  ): Unsubscribe {
    return this.chartModel.subscribeVisibleRangeChange(handler);
  }

  timeScale(): TimeScaleApi {
    return this.timeScaleApi;
  }

  dispose(): void {
    this.chartModel.dispose();
  }
}

export function createChart(
  container: HTMLElement,
  options?: ChartOptions,
): ChartApi {
  return new ChartApiImpl(new ChartModel(container, options));
}
