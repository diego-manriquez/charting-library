import type { PriceRange } from "../../core/scales/price-scale";
import type { IndexRange } from "../../core/scales/time-scale";
import type { VolumeBuffer } from "../../data/buffers/volume-buffer";
import type { VolumeSeriesOptions } from "../../public-api/types";
import { indexToX, priceToY } from "../common/chart-coordinates";
import type { PlotArea } from "../common/geometry";

const DEFAULT_VOLUME_SERIES_OPTIONS: Required<VolumeSeriesOptions> = {
  color: "rgba(59, 130, 246, 0.45)",
  barSpacingRatio: 0.72,
};

export function resolveVolumeSeriesOptions(
  options: VolumeSeriesOptions | undefined,
): Required<VolumeSeriesOptions> {
  return {
    color: options?.color ?? DEFAULT_VOLUME_SERIES_OPTIONS.color,
    barSpacingRatio:
      options?.barSpacingRatio ?? DEFAULT_VOLUME_SERIES_OPTIONS.barSpacingRatio,
  };
}

export function renderVolumeSeries(params: {
  context: CanvasRenderingContext2D;
  buffer: VolumeBuffer;
  options: Required<VolumeSeriesOptions>;
  visibleRange: IndexRange;
  valueRange: PriceRange;
  plotArea: PlotArea;
}): void {
  const { context, buffer, options, visibleRange, valueRange, plotArea } =
    params;

  if (buffer.length === 0 || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }

  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const barSpacing = plotArea.width / visibleCount;
  const barWidth = Math.max(
    1,
    Math.min(16, barSpacing * options.barSpacingRatio),
  );
  const baseY = plotArea.y + plotArea.height;

  for (let index = visibleRange.from; index <= visibleRange.to; index += 1) {
    const value = buffer.value[index];

    if (value === undefined) {
      continue;
    }

    const x = indexToX(index, visibleRange, plotArea);
    const y = priceToY(value, valueRange, plotArea);
    const color = buffer.color[index] ?? options.color;

    context.fillStyle = color;
    context.fillRect(x - barWidth / 2, y, barWidth, Math.max(1, baseY - y));
  }
}
