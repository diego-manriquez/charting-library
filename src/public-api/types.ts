export type SeriesType = "candlestick" | "line";
export type Unsubscribe = () => void;

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

export interface LineSeriesOptions {
  color?: string;
  lineWidth?: number;
}

export interface CandlestickData {
  time: number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LineData {
  time: number | Date;
  value: number;
}

export interface CandlestickSeriesApi {
  setData(data: CandlestickData[]): void;
  update(data: CandlestickData): void;
}

export interface LineSeriesApi {
  setData(data: LineData[]): void;
  update(data: LineData): void;
}

export interface CrosshairMoveEvent {
  point: { x: number; y: number } | undefined;
  time: number | undefined;
  price: number | undefined;
}

export interface VisibleRange {
  from: number;
  to: number;
}

export interface TimeScaleApi {
  fitContent(): void;
}

export interface ChartApi {
  addSeries(
    type: "candlestick",
    options?: CandlestickSeriesOptions,
  ): CandlestickSeriesApi;
  addSeries(
    type: "line",
    options?: LineSeriesOptions,
  ): LineSeriesApi;
  removeSeries(series: CandlestickSeriesApi | LineSeriesApi): void;
  resize(width: number, height: number): void;
  subscribeCrosshairMove(
    handler: (event: CrosshairMoveEvent) => void,
  ): Unsubscribe;
  subscribeVisibleRangeChange(
    handler: (range: VisibleRange | undefined) => void,
  ): Unsubscribe;
  timeScale(): TimeScaleApi;
  dispose(): void;
}
