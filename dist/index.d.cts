type SeriesType = "candlestick" | "line";
interface ChartPaddingOptions {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}
interface GridOptions {
    visible?: boolean;
    color?: string;
    horizontalLines?: number;
    verticalLines?: number;
}
interface ChartOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    textColor?: string;
    padding?: ChartPaddingOptions;
    grid?: GridOptions;
}
interface CandlestickSeriesOptions {
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
    bodySpacingRatio?: number;
}
interface LineSeriesOptions {
    color?: string;
    lineWidth?: number;
}
interface CandlestickData {
    time: number | Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
interface LineData {
    time: number | Date;
    value: number;
}
interface CandlestickSeriesApi {
    setData(data: CandlestickData[]): void;
    update(data: CandlestickData): void;
}
interface LineSeriesApi {
    setData(data: LineData[]): void;
    update(data: LineData): void;
}
interface TimeScaleApi {
    fitContent(): void;
}
interface ChartApi {
    addSeries(type: "candlestick", options?: CandlestickSeriesOptions): CandlestickSeriesApi;
    addSeries(type: "line", options?: LineSeriesOptions): LineSeriesApi;
    removeSeries(series: CandlestickSeriesApi | LineSeriesApi): void;
    resize(width: number, height: number): void;
    timeScale(): TimeScaleApi;
    dispose(): void;
}

declare function createChart(container: HTMLElement, options?: ChartOptions): ChartApi;

export { type CandlestickData, type CandlestickSeriesApi, type CandlestickSeriesOptions, type ChartApi, type ChartOptions, type LineData, type LineSeriesApi, type LineSeriesOptions, type SeriesType, type TimeScaleApi, createChart };
