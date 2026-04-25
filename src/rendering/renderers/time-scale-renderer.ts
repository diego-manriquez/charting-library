import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { IndexRange } from "../../core/scales/time-scale";
import type { PlotArea } from "../common/geometry";
import { formatTimeLabel } from "../common/chart-coordinates";

interface TimeScaleTick {
  x: number;
  label: string;
}

export function renderTimeScale(params: {
  context: CanvasRenderingContext2D;
  area: PlotArea;
  plotArea: PlotArea;
  buffer: CandleBuffer | undefined;
  visibleRange: IndexRange;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  tickCount: number;
}): void {
  const {
    context,
    area,
    plotArea,
    buffer,
    visibleRange,
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
  context.moveTo(area.x, area.y + 0.5);
  context.lineTo(area.x + area.width, area.y + 0.5);
  context.stroke();

  if (!buffer || buffer.length === 0) {
    return;
  }

  context.fillStyle = textColor;
  context.font = "12px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const tick of getTimeScaleTicks(buffer, visibleRange, plotArea, tickCount)) {
    context.fillText(tick.label, tick.x, area.y + area.height / 2);
  }
}

export function getTimeScaleTicks(
  buffer: CandleBuffer,
  visibleRange: IndexRange,
  plotArea: PlotArea,
  tickCount: number,
): TimeScaleTick[] {
  const ticks: TimeScaleTick[] = [];
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const safeTickCount = Math.max(2, Math.min(tickCount, visibleCount));
  const denominator = Math.max(1, safeTickCount - 1);

  for (let tickIndex = 0; tickIndex < safeTickCount; tickIndex += 1) {
    const ratio = tickIndex / denominator;
    const index = Math.min(
      visibleRange.to,
      visibleRange.from + Math.round(ratio * (visibleCount - 1)),
    );
    const timestamp = buffer.time[index];

    if (timestamp === undefined) {
      continue;
    }

    ticks.push({
      x: plotArea.x + ratio * plotArea.width,
      label: formatTimeLabel(timestamp, visibleCount),
    });
  }

  return dedupeTicks(ticks);
}
function dedupeTicks(ticks: TimeScaleTick[]): TimeScaleTick[] {
  const deduped: TimeScaleTick[] = [];
  let previousLabel = "";

  for (const tick of ticks) {
    if (tick.label === previousLabel) {
      continue;
    }

    deduped.push(tick);
    previousLabel = tick.label;
  }

  return deduped;
}
