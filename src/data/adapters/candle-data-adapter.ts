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

export function updateCandleBuffer(
  buffer: CandleBuffer,
  data: CandlestickData,
): CandleBuffer {
  const timestamp = normalizeTimestamp(data.time);

  validateCandle(data, buffer.length, timestamp);

  if (buffer.length === 0) {
    return createCandleBuffer([data]);
  }

  const lastIndex = buffer.length - 1;
  const lastTimestamp = buffer.time[lastIndex];

  if (lastTimestamp === undefined) {
    throw new Error("Missing last candle timestamp.");
  }

  if (timestamp < lastTimestamp) {
    throw new Error("New candle time must be >= the last candle time.");
  }

  if (timestamp === lastTimestamp) {
    return replaceLastCandle(buffer, timestamp, data);
  }

  return appendCandle(buffer, timestamp, data);
}

function replaceLastCandle(
  buffer: CandleBuffer,
  timestamp: number,
  data: CandlestickData,
): CandleBuffer {
  const nextBuffer = cloneBuffer(buffer);
  const lastIndex = nextBuffer.length - 1;

  nextBuffer.time[lastIndex] = timestamp;
  nextBuffer.open[lastIndex] = data.open;
  nextBuffer.high[lastIndex] = data.high;
  nextBuffer.low[lastIndex] = data.low;
  nextBuffer.close[lastIndex] = data.close;
  nextBuffer.volume[lastIndex] = data.volume ?? 0;

  return nextBuffer;
}

function appendCandle(
  buffer: CandleBuffer,
  timestamp: number,
  data: CandlestickData,
): CandleBuffer {
  const nextLength = buffer.length + 1;
  const nextBuffer = {
    time: copyWithExpandedCapacity(buffer.time, nextLength),
    open: copyWithExpandedCapacity(buffer.open, nextLength),
    high: copyWithExpandedCapacity(buffer.high, nextLength),
    low: copyWithExpandedCapacity(buffer.low, nextLength),
    close: copyWithExpandedCapacity(buffer.close, nextLength),
    volume: copyWithExpandedCapacity(buffer.volume, nextLength),
    length: nextLength,
  };
  const lastIndex = nextLength - 1;

  nextBuffer.time[lastIndex] = timestamp;
  nextBuffer.open[lastIndex] = data.open;
  nextBuffer.high[lastIndex] = data.high;
  nextBuffer.low[lastIndex] = data.low;
  nextBuffer.close[lastIndex] = data.close;
  nextBuffer.volume[lastIndex] = data.volume ?? 0;

  return nextBuffer;
}

function cloneBuffer(buffer: CandleBuffer): CandleBuffer {
  return {
    time: buffer.time.slice(),
    open: buffer.open.slice(),
    high: buffer.high.slice(),
    low: buffer.low.slice(),
    close: buffer.close.slice(),
    volume: buffer.volume.slice(),
    length: buffer.length,
  };
}

function copyWithExpandedCapacity(
  source: Float64Array,
  nextLength: number,
): Float64Array {
  const next = new Float64Array(nextLength);
  next.set(source);
  return next;
}

function normalizeTimestamp(time: CandlestickData["time"]): number {
  return time instanceof Date ? time.getTime() : time;
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
