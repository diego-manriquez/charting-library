import type { CandlestickData } from "../../public-api/types";
import type { CandleBuffer } from "../buffers/candle-buffer";

export function createCandleBuffer(data: CandlestickData[]): CandleBuffer {
  const length = data.length;
  const time = new Float64Array(length);
  const open = new Float64Array(length);
  const high = new Float64Array(length);
  const low = new Float64Array(length);
  const close = new Float64Array(length);
  const volume = new Float64Array(length);

  for (let index = 0; index < length; index += 1) {
    const candle = data[index];
    if (!candle) {
      throw new Error(`Missing candle at index ${index}.`);
    }

    const timestamp =
      candle.time instanceof Date ? candle.time.getTime() : candle.time;

    validateCandle(candle, index, timestamp);

    time[index] = timestamp;
    open[index] = candle.open;
    high[index] = candle.high;
    low[index] = candle.low;
    close[index] = candle.close;
    volume[index] = candle.volume ?? 0;
  }

  return {
    time,
    open,
    high,
    low,
    close,
    volume,
    length,
  };
}

function validateCandle(
  candle: CandlestickData,
  index: number,
  timestamp: number,
): void {
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid candle time at index ${index}.`);
  }

  if (
    !Number.isFinite(candle.open) ||
    !Number.isFinite(candle.high) ||
    !Number.isFinite(candle.low) ||
    !Number.isFinite(candle.close)
  ) {
    throw new Error(`Invalid candle values at index ${index}.`);
  }

  if (candle.high < candle.low) {
    throw new Error(`Candle high must be >= low at index ${index}.`);
  }
}
