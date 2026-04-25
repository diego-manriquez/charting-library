export interface Size {
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartLayout {
  plotArea: PlotArea;
  priceScaleArea: PlotArea;
  timeScaleArea: PlotArea;
}

export interface ScaleLayoutOptions {
  priceScaleWidth: number;
  timeScaleHeight: number;
}

export function getChartLayout(
  size: Size,
  padding: Insets,
  scales: ScaleLayoutOptions,
): ChartLayout {
  const innerWidth = Math.max(0, size.width - padding.left - padding.right);
  const innerHeight = Math.max(0, size.height - padding.top - padding.bottom);
  const priceScaleWidth = Math.min(scales.priceScaleWidth, innerWidth);
  const timeScaleHeight = Math.min(scales.timeScaleHeight, innerHeight);
  const plotWidth = Math.max(0, innerWidth - priceScaleWidth);
  const plotHeight = Math.max(0, innerHeight - timeScaleHeight);

  return {
    plotArea: {
      x: padding.left,
      y: padding.top,
      width: plotWidth,
      height: plotHeight,
    },
    priceScaleArea: {
      x: padding.left + plotWidth,
      y: padding.top,
      width: priceScaleWidth,
      height: plotHeight,
    },
    timeScaleArea: {
      x: padding.left,
      y: padding.top + plotHeight,
      width: plotWidth,
      height: timeScaleHeight,
    },
  };
}

export function getPlotArea(size: Size, padding: Insets): PlotArea {
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, size.width - padding.left - padding.right),
    height: Math.max(0, size.height - padding.top - padding.bottom),
  };
}
