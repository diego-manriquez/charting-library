import { ChartModel } from "../core/chart/chart-model";
import type {
  CandlestickData,
  CandlestickSeriesApi,
  CandlestickSeriesOptions,
  ChartApi,
  ChartOptions,
  SeriesType,
  TimeScaleApi,
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

class TimeScaleApiImpl implements TimeScaleApi {
  constructor(private readonly chartModel: ChartModel) {}

  fitContent(): void {
    this.chartModel.fitContent();
    this.chartModel.render();
  }
}

class ChartApiImpl implements ChartApi {
  private readonly timeScaleApi: TimeScaleApi;
  private readonly seriesApiIds = new WeakMap<CandlestickSeriesApi, number>();

  constructor(private readonly chartModel: ChartModel) {
    this.timeScaleApi = new TimeScaleApiImpl(chartModel);
  }

  addSeries(
    type: SeriesType,
    options?: CandlestickSeriesOptions,
  ): CandlestickSeriesApi {
    if (type !== "candlestick") {
      throw new Error(`Unsupported series type: ${type}.`);
    }

    const seriesId = this.chartModel.addCandlestickSeries(options);
    const api = new CandlestickSeriesApiImpl(this.chartModel, seriesId);
    this.seriesApiIds.set(api, seriesId);

    return api;
  }

  removeSeries(series: CandlestickSeriesApi): void {
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
