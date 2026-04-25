import type { VolumeBuffer } from "../../data/buffers/volume-buffer";
import type { PriceRange } from "./price-scale";
import type { IndexRange } from "./time-scale";

const DEFAULT_VOLUME_RANGE: PriceRange = {
  min: 0,
  max: 1,
};

export class VolumeScaleModel {
  getVisibleVolumeRange(
    buffers: VolumeBuffer[],
    visibleRange: IndexRange,
  ): PriceRange {
    let max = Number.NEGATIVE_INFINITY;

    for (const buffer of buffers) {
      if (buffer.length === 0) {
        continue;
      }

      const from = Math.max(0, Math.min(visibleRange.from, buffer.length - 1));
      const to = Math.max(from, Math.min(visibleRange.to, buffer.length - 1));

      for (let index = from; index <= to; index += 1) {
        max = Math.max(max, buffer.value[index] ?? max);
      }
    }

    if (!Number.isFinite(max) || max <= 0) {
      return DEFAULT_VOLUME_RANGE;
    }

    return {
      min: 0,
      max: max * 1.1,
    };
  }
}
