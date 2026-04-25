export interface IndexRange {
  from: number;
  to: number;
}

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
    const from = Math.max(0, Math.min(this.visibleRange.from, maxIndex));
    const to = Math.max(from, Math.min(this.visibleRange.to, maxIndex));

    return { from, to };
  }
}
