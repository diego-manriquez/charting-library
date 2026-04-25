import type { PlotArea } from "../common/geometry";

export interface CrosshairState {
  x: number;
  y: number;
  priceLabel: string;
  timeLabel: string;
}

export function renderCrosshair(params: {
  context: CanvasRenderingContext2D;
  plotArea: PlotArea;
  priceScaleArea: PlotArea;
  timeScaleArea: PlotArea;
  state: CrosshairState;
  lineColor: string;
  textColor: string;
  accentColor: string;
}): void {
  const {
    context,
    plotArea,
    priceScaleArea,
    timeScaleArea,
    state,
    lineColor,
    textColor,
    accentColor,
  } = params;

  context.save();
  context.strokeStyle = lineColor;
  context.lineWidth = 1;
  context.setLineDash([4, 4]);

  context.beginPath();
  context.moveTo(state.x, plotArea.y);
  context.lineTo(state.x, plotArea.y + plotArea.height);
  context.moveTo(plotArea.x, state.y);
  context.lineTo(plotArea.x + plotArea.width, state.y);
  context.stroke();
  context.setLineDash([]);

  drawAxisLabel({
    context,
    area: priceScaleArea,
    centerX: priceScaleArea.x + priceScaleArea.width / 2,
    centerY: state.y,
    text: state.priceLabel,
    textColor,
    backgroundColor: accentColor,
    horizontal: true,
  });

  drawAxisLabel({
    context,
    area: timeScaleArea,
    centerX: state.x,
    centerY: timeScaleArea.y + timeScaleArea.height / 2,
    text: state.timeLabel,
    textColor,
    backgroundColor: accentColor,
    horizontal: false,
  });

  context.restore();
}

function drawAxisLabel(params: {
  context: CanvasRenderingContext2D;
  area: PlotArea;
  centerX: number;
  centerY: number;
  text: string;
  textColor: string;
  backgroundColor: string;
  horizontal: boolean;
}): void {
  const {
    context,
    area,
    centerX,
    centerY,
    text,
    textColor,
    backgroundColor,
    horizontal,
  } = params;
  const paddingX = 8;
  const paddingY = 4;

  context.font = "12px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const textWidth = context.measureText(text).width;
  const labelWidth = Math.min(area.width - 8, textWidth + paddingX * 2);
  const labelHeight = horizontal ? 20 : Math.min(area.height - 8, 20);
  const clampedCenterX = clamp(
    centerX,
    area.x + labelWidth / 2 + 4,
    area.x + area.width - labelWidth / 2 - 4,
  );
  const clampedCenterY = clamp(
    centerY,
    area.y + labelHeight / 2 + 4,
    area.y + area.height - labelHeight / 2 - 4,
  );
  const labelX = clampedCenterX - labelWidth / 2;
  const labelY = clampedCenterY - labelHeight / 2;

  context.fillStyle = backgroundColor;
  context.fillRect(labelX, labelY, labelWidth, labelHeight);

  context.fillStyle = textColor;
  context.fillText(text, clampedCenterX, clampedCenterY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
