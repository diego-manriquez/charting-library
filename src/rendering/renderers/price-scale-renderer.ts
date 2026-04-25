import type { PriceRange } from "../../core/scales/price-scale";
import type { PlotArea } from "../common/geometry";
import {
  formatPriceLabel,
  priceToY,
} from "../common/chart-coordinates";

export interface PriceScaleTick {
  y: number;
  value: number;
}

export function renderPriceScale(params: {
  context: CanvasRenderingContext2D;
  area: PlotArea;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  ticks: PriceScaleTick[];
}): void {
  const {
    context,
    area,
    textColor,
    borderColor,
    backgroundColor,
    ticks,
  } = params;

  if (area.width <= 0 || area.height <= 0) {
    return;
  }

  context.fillStyle = backgroundColor;
  context.fillRect(area.x, area.y, area.width, area.height);

  context.strokeStyle = borderColor;
  context.beginPath();
  context.moveTo(area.x + 0.5, area.y);
  context.lineTo(area.x + 0.5, area.y + area.height);
  context.stroke();

  context.fillStyle = textColor;
  context.font = "12px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const tick of ticks) {
    context.fillText(
      formatPriceLabel(tick.value),
      area.x + area.width / 2,
      tick.y,
    );
  }
}

export function getPriceScaleTicks(
  priceRange: PriceRange,
  plotArea: PlotArea,
  tickCount: number,
): PriceScaleTick[] {
  const safeTickCount = Math.max(2, tickCount);
  const approximateStep =
    (priceRange.max - priceRange.min) / Math.max(1, safeTickCount - 1);
  const step = getNiceStep(approximateStep);
  let start = Math.ceil(priceRange.min / step) * step;
  let end = Math.floor(priceRange.max / step) * step;

  if (start > end) {
    start = Math.floor(priceRange.min / step) * step;
    end = Math.ceil(priceRange.max / step) * step;
  }

  const ticks: PriceScaleTick[] = [];

  for (let value = end; value >= start - step * 0.5; value -= step) {
    const normalizedValue = normalizeTickValue(value);
    ticks.push({
      y: priceToY(normalizedValue, priceRange, plotArea),
      value: normalizedValue,
    });
  }

  if (ticks.length === 0) {
    const mid = normalizeTickValue((priceRange.min + priceRange.max) / 2);
    ticks.push({
      y: priceToY(mid, priceRange, plotArea),
      value: mid,
    });
  }

  return ticks;
}

function getNiceStep(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction = 10;

  if (fraction < 1.5) {
    niceFraction = 1;
  } else if (fraction < 3) {
    niceFraction = 2;
  } else if (fraction < 7) {
    niceFraction = 5;
  }

  return niceFraction * 10 ** exponent;
}

function normalizeTickValue(value: number): number {
  return Number(value.toFixed(8));
}
