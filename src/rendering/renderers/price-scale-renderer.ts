import type { PriceRange } from "../../core/scales/price-scale";
import type { PlotArea } from "../common/geometry";
import { formatPriceLabel } from "../common/chart-coordinates";

interface PriceScaleTick {
  y: number;
  value: number;
}

export function renderPriceScale(params: {
  context: CanvasRenderingContext2D;
  area: PlotArea;
  priceRange: PriceRange;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  tickCount: number;
}): void {
  const {
    context,
    area,
    priceRange,
    textColor,
    borderColor,
    backgroundColor,
    tickCount,
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
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (const tick of getPriceScaleTicks(priceRange, area, tickCount)) {
    context.fillText(
      formatPriceLabel(tick.value),
      area.x + area.width - 8,
      tick.y,
    );
  }
}

export function getPriceScaleTicks(
  priceRange: PriceRange,
  area: PlotArea,
  tickCount: number,
): PriceScaleTick[] {
  const ticks: PriceScaleTick[] = [];
  const safeTickCount = Math.max(2, tickCount);

  for (let index = 0; index < safeTickCount; index += 1) {
    const ratio =
      safeTickCount === 1 ? 0 : index / (safeTickCount - 1);
    ticks.push({
      y: area.y + ratio * area.height,
      value: priceRange.max - ratio * (priceRange.max - priceRange.min),
    });
  }

  return ticks;
}
