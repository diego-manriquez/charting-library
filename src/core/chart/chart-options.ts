import type { ChartOptions } from "../../public-api/types";

export interface ResolvedChartOptions {
  width: number | undefined;
  height: number | undefined;
  backgroundColor: string;
  textColor: string;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  grid: {
    visible: boolean;
    color: string;
    horizontalLines: number;
    verticalLines: number;
  };
}

export function resolveChartOptions(
  options: ChartOptions | undefined,
): ResolvedChartOptions {
  return {
    width: options?.width,
    height: options?.height,
    backgroundColor: options?.backgroundColor ?? "#0b1220",
    textColor: options?.textColor ?? "#cbd5e1",
    padding: {
      top: options?.padding?.top ?? 16,
      right: options?.padding?.right ?? 16,
      bottom: options?.padding?.bottom ?? 24,
      left: options?.padding?.left ?? 16,
    },
    grid: {
      visible: options?.grid?.visible ?? true,
      color: options?.grid?.color ?? "rgba(148, 163, 184, 0.18)",
      horizontalLines: options?.grid?.horizontalLines ?? 5,
      verticalLines: options?.grid?.verticalLines ?? 6,
    },
  };
}
