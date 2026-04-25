export type SeriesType = "candlestick";

export interface ChartPaddingOptions {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface GridOptions {
  visible?: boolean;
  color?: string;
  horizontalLines?: number;
  verticalLines?: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  padding?: ChartPaddingOptions;
  grid?: GridOptions;
}

export interface CandlestickSeriesOptions {
  upColor?: string;
  downColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
  bodySpacingRatio?: number;
}

export interface CandlestickData {
  time: number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandlestickSeriesApi {
  setData(data: CandlestickData[]): void;
  update(data: CandlestickData): void;
}

export interface TimeScaleApi {
  fitContent(): void;
}

export interface ChartApi {
  addSeries(
    type: "candlestick",
    options?: CandlestickSeriesOptions,
  ): CandlestickSeriesApi;
  removeSeries(series: CandlestickSeriesApi): void;
  resize(width: number, height: number): void;
  timeScale(): TimeScaleApi;
  dispose(): void;
}
