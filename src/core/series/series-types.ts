import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { LineBuffer } from "../../data/buffers/line-buffer";

export type SeriesDataBuffer = CandleBuffer | LineBuffer;

export function isCandleBuffer(buffer: SeriesDataBuffer): buffer is CandleBuffer {
  return "open" in buffer && "high" in buffer && "low" in buffer && "close" in buffer;
}

export function getSeriesBufferLength(buffer: SeriesDataBuffer): number {
  return buffer.length;
}

export function getSeriesBufferTimeAt(
  buffer: SeriesDataBuffer,
  index: number,
): number | undefined {
  return buffer.time[index];
}
