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
  secondaryPlotArea?: PlotArea;
  secondaryPriceScaleArea?: PlotArea;
}

export interface ScaleLayoutOptions {
  priceScaleWidth: number;
  timeScaleHeight: number;
  secondaryPaneHeight?: number;
  paneGap?: number;
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
  const contentHeight = Math.max(0, innerHeight - timeScaleHeight);
  const paneGap =
    scales.secondaryPaneHeight !== undefined ? Math.max(0, scales.paneGap ?? 0) : 0;
  const secondaryPaneHeight = scales.secondaryPaneHeight
    ? Math.min(scales.secondaryPaneHeight, Math.max(0, contentHeight - paneGap))
    : 0;
  const plotHeight = Math.max(0, contentHeight - secondaryPaneHeight - paneGap);
  const secondaryY = padding.top + plotHeight + paneGap;

  const layout: ChartLayout = {
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
      y: padding.top + plotHeight + paneGap + secondaryPaneHeight,
      width: plotWidth,
      height: timeScaleHeight,
    },
  };

  if (secondaryPaneHeight > 0) {
    layout.secondaryPlotArea = {
      x: padding.left,
      y: secondaryY,
      width: plotWidth,
      height: secondaryPaneHeight,
    };
    layout.secondaryPriceScaleArea = {
      x: padding.left + plotWidth,
      y: secondaryY,
      width: priceScaleWidth,
      height: secondaryPaneHeight,
    };
  }

  return layout;
}

export function getPlotArea(size: Size, padding: Insets): PlotArea {
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, size.width - padding.left - padding.right),
    height: Math.max(0, size.height - padding.top - padding.bottom),
  };
}
