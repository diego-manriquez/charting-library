import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { LineBuffer } from "../../data/buffers/line-buffer";
import type { IndexRange } from "./time-scale";

export interface PriceRange {
  min: number;
  max: number;
}

const DEFAULT_PRICE_RANGE: PriceRange = {
  min: 0,
  max: 1,
};

export class PriceScaleModel {
  getVisiblePriceRange(
    buffers: Array<CandleBuffer | LineBuffer>,
    visibleRange: IndexRange,
  ): PriceRange {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const buffer of buffers) {
      if (buffer.length === 0) {
        continue;
      }

      const from = Math.max(0, Math.min(visibleRange.from, buffer.length - 1));
      const to = Math.max(from, Math.min(visibleRange.to, buffer.length - 1));

      for (let index = from; index <= to; index += 1) {
        if (isLineBuffer(buffer)) {
          min = Math.min(min, buffer.value[index] ?? min);
          max = Math.max(max, buffer.value[index] ?? max);
          continue;
        }

        min = Math.min(min, buffer.low[index] ?? min);
        max = Math.max(max, buffer.high[index] ?? max);
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return DEFAULT_PRICE_RANGE;
    }

    if (min === max) {
      const padding = min === 0 ? 1 : Math.abs(min) * 0.01;
      return {
        min: min - padding,
        max: max + padding,
      };
    }

    const delta = max - min;
    const padding = delta * 0.1;

    return {
      min: min - padding,
      max: max + padding,
    };
  }
}

function isLineBuffer(buffer: CandleBuffer | LineBuffer): buffer is LineBuffer {
  return "value" in buffer;
}
