export interface IndexRange {
  from: number;
  to: number;
}

const MIN_VISIBLE_BARS = 10;

export class TimeScaleModel {
  private visibleRange: IndexRange = { from: 0, to: 0 };

  fitContent(length: number): void {
    if (length <= 0) {
      this.visibleRange = { from: 0, to: 0 };
      return;
    }

    this.visibleRange = { from: 0, to: length - 1 };
  }

  getVisibleRange(length: number): IndexRange {
    if (length <= 0) {
      return { from: 0, to: 0 };
    }

    const maxIndex = length - 1;
    const currentSpan = Math.max(1, this.visibleRange.to - this.visibleRange.from + 1);
    const visibleSpan = Math.min(currentSpan, length);
    const maxFrom = Math.max(0, length - visibleSpan);
    const from = clamp(this.visibleRange.from, 0, maxFrom);
    const to = Math.min(maxIndex, from + visibleSpan - 1);

    return { from, to };
  }

  zoom(length: number, anchorRatio: number, scaleFactor: number): void {
    if (length <= 0 || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
      return;
    }

    const current = this.getVisibleRange(length);
    const currentSpan = current.to - current.from + 1;
    const nextSpan = clamp(
      Math.round(currentSpan * scaleFactor),
      Math.min(MIN_VISIBLE_BARS, length),
      length,
    );
    const clampedAnchorRatio = clamp(anchorRatio, 0, 1);
    const anchorIndex =
      current.from + clampedAnchorRatio * Math.max(0, currentSpan - 1);
    let from = Math.round(anchorIndex - clampedAnchorRatio * Math.max(0, nextSpan - 1));
    const maxFrom = Math.max(0, length - nextSpan);

    from = clamp(from, 0, maxFrom);
    this.visibleRange = {
      from,
      to: from + nextSpan - 1,
    };
  }

  pan(length: number, deltaBars: number): void {
    if (length <= 0 || deltaBars === 0) {
      return;
    }

    const current = this.getVisibleRange(length);
    const span = current.to - current.from + 1;
    const maxFrom = Math.max(0, length - span);
    const from = clamp(current.from + deltaBars, 0, maxFrom);

    this.visibleRange = {
      from,
      to: from + span - 1,
    };
  }

  isRightEdgeVisible(length: number): boolean {
    if (length <= 0) {
      return true;
    }

    const visibleRange = this.getVisibleRange(length);
    return visibleRange.to >= length - 1;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
