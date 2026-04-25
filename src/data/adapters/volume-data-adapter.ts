import type { VolumeData } from "../../public-api/types";
import type { VolumeBuffer } from "../buffers/volume-buffer";

export function createVolumeBuffer(data: VolumeData[]): VolumeBuffer {
  const length = data.length;
  const time = new Float64Array(length);
  const value = new Float64Array(length);
  const color = new Array<string | undefined>(length);

  for (let index = 0; index < length; index += 1) {
    const point = data[index];

    if (!point) {
      throw new Error(`Missing volume point at index ${index}.`);
    }

    const timestamp = normalizeTimestamp(point.time);
    validateVolumePoint(point, index, timestamp);

    time[index] = timestamp;
    value[index] = point.value;
    color[index] = point.color;
  }

  return {
    time,
    value,
    color,
    length,
  };
}

export function updateVolumeBuffer(
  buffer: VolumeBuffer,
  data: VolumeData,
): VolumeBuffer {
  const timestamp = normalizeTimestamp(data.time);

  validateVolumePoint(data, buffer.length, timestamp);

  if (buffer.length === 0) {
    return createVolumeBuffer([data]);
  }

  const lastIndex = buffer.length - 1;
  const lastTimestamp = buffer.time[lastIndex];

  if (lastTimestamp === undefined) {
    throw new Error("Missing last volume point timestamp.");
  }

  if (timestamp < lastTimestamp) {
    throw new Error("New volume point time must be >= the last point time.");
  }

  if (timestamp === lastTimestamp) {
    const nextBuffer = cloneBuffer(buffer);
    nextBuffer.time[lastIndex] = timestamp;
    nextBuffer.value[lastIndex] = data.value;
    nextBuffer.color[lastIndex] = data.color;
    return nextBuffer;
  }

  const nextLength = buffer.length + 1;
  const nextBuffer = {
    time: copyWithExpandedCapacity(buffer.time, nextLength),
    value: copyWithExpandedCapacity(buffer.value, nextLength),
    color: buffer.color.slice(),
    length: nextLength,
  };

  nextBuffer.time[nextLength - 1] = timestamp;
  nextBuffer.value[nextLength - 1] = data.value;
  nextBuffer.color[nextLength - 1] = data.color;

  return nextBuffer;
}

function validateVolumePoint(
  point: VolumeData,
  index: number,
  timestamp: number,
): void {
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid volume point time at index ${index}.`);
  }

  if (!Number.isFinite(point.value) || point.value < 0) {
    throw new Error(`Invalid volume point value at index ${index}.`);
  }
}

function normalizeTimestamp(time: VolumeData["time"]): number {
  return time instanceof Date ? time.getTime() : time;
}

function cloneBuffer(buffer: VolumeBuffer): VolumeBuffer {
  return {
    time: buffer.time.slice(),
    value: buffer.value.slice(),
    color: buffer.color.slice(),
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
