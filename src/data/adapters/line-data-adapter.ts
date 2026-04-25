import type { LineData } from "../../public-api/types";
import type { LineBuffer } from "../buffers/line-buffer";

export function createLineBuffer(data: LineData[]): LineBuffer {
  const length = data.length;
  const time = new Float64Array(length);
  const value = new Float64Array(length);

  for (let index = 0; index < length; index += 1) {
    const point = data[index];

    if (!point) {
      throw new Error(`Missing line point at index ${index}.`);
    }

    const timestamp = normalizeTimestamp(point.time);
    validateLinePoint(point, index, timestamp);

    time[index] = timestamp;
    value[index] = point.value;
  }

  return {
    time,
    value,
    length,
  };
}

export function updateLineBuffer(buffer: LineBuffer, data: LineData): LineBuffer {
  const timestamp = normalizeTimestamp(data.time);

  validateLinePoint(data, buffer.length, timestamp);

  if (buffer.length === 0) {
    return createLineBuffer([data]);
  }

  const lastIndex = buffer.length - 1;
  const lastTimestamp = buffer.time[lastIndex];

  if (lastTimestamp === undefined) {
    throw new Error("Missing last line point timestamp.");
  }

  if (timestamp < lastTimestamp) {
    throw new Error("New line point time must be >= the last point time.");
  }

  if (timestamp === lastTimestamp) {
    const nextBuffer = cloneBuffer(buffer);
    nextBuffer.time[lastIndex] = timestamp;
    nextBuffer.value[lastIndex] = data.value;
    return nextBuffer;
  }

  const nextLength = buffer.length + 1;
  const nextBuffer = {
    time: copyWithExpandedCapacity(buffer.time, nextLength),
    value: copyWithExpandedCapacity(buffer.value, nextLength),
    length: nextLength,
  };

  nextBuffer.time[nextLength - 1] = timestamp;
  nextBuffer.value[nextLength - 1] = data.value;

  return nextBuffer;
}

function validateLinePoint(
  point: LineData,
  index: number,
  timestamp: number,
): void {
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid line point time at index ${index}.`);
  }

  if (!Number.isFinite(point.value)) {
    throw new Error(`Invalid line point value at index ${index}.`);
  }
}

function normalizeTimestamp(time: LineData["time"]): number {
  return time instanceof Date ? time.getTime() : time;
}

function cloneBuffer(buffer: LineBuffer): LineBuffer {
  return {
    time: buffer.time.slice(),
    value: buffer.value.slice(),
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
