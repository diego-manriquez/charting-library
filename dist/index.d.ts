type SeriesType = "candlestick" | "line" | "volume";
type Unsubscribe = () => void;
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
interface VolumeSeriesOptions {
    color?: string;
    barSpacingRatio?: number;
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
interface VolumeData {
    time: number | Date;
    value: number;
    color?: string;
}
interface CandlestickSeriesApi {
    setData(data: CandlestickData[]): void;
    update(data: CandlestickData): void;
}
interface LineSeriesApi {
    setData(data: LineData[]): void;
    update(data: LineData): void;
}
interface VolumeSeriesApi {
    setData(data: VolumeData[]): void;
    update(data: VolumeData): void;
}
interface CrosshairMoveEvent {
    point: {
        x: number;
        y: number;
    } | undefined;
    time: number | undefined;
    price: number | undefined;
}
interface VisibleRange {
    from: number;
    to: number;
}
interface TimeScaleApi {
    fitContent(): void;
}
interface ChartApi {
    addSeries(type: "candlestick", options?: CandlestickSeriesOptions): CandlestickSeriesApi;
    addSeries(type: "line", options?: LineSeriesOptions): LineSeriesApi;
    addSeries(type: "volume", options?: VolumeSeriesOptions): VolumeSeriesApi;
    removeSeries(series: CandlestickSeriesApi | LineSeriesApi | VolumeSeriesApi): void;
    resize(width: number, height: number): void;
    subscribeCrosshairMove(handler: (event: CrosshairMoveEvent) => void): Unsubscribe;
    subscribeVisibleRangeChange(handler: (range: VisibleRange | undefined) => void): Unsubscribe;
    timeScale(): TimeScaleApi;
    dispose(): void;
}

declare function createChart(container: HTMLElement, options?: ChartOptions): ChartApi;

export { type CandlestickData, type CandlestickSeriesApi, type CandlestickSeriesOptions, type ChartApi, type ChartOptions, type CrosshairMoveEvent, type LineData, type LineSeriesApi, type LineSeriesOptions, type SeriesType, type TimeScaleApi, type Unsubscribe, type VisibleRange, type VolumeData, type VolumeSeriesApi, type VolumeSeriesOptions, createChart };
