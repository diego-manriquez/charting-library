import type { Size } from "../common/geometry";

export class CanvasLayerManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private pixelRatio = 1;

  constructor(private readonly container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.container.append(this.canvas);

    const context = this.canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.context = context;
  }

  resize(size: Size): void {
    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(size.width * this.pixelRatio));
    this.canvas.height = Math.max(
      1,
      Math.floor(size.height * this.pixelRatio),
    );
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  clear(): void {
    this.context.clearRect(
      0,
      0,
      this.canvas.width / this.pixelRatio,
      this.canvas.height / this.pixelRatio,
    );
  }

  dispose(): void {
    this.canvas.remove();
  }
}
