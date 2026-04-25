import { createChart } from "../../dist/index.js";

const container = document.getElementById("chart");

if (!container) {
  throw new Error("Missing chart container.");
}

const chart = createChart(container, {
  backgroundColor: "#020617",
  grid: {
    visible: true,
    color: "rgba(148, 163, 184, 0.14)",
    horizontalLines: 5,
    verticalLines: 7,
  },
});

const candles = chart.addSeries("candlestick", {
  upColor: "#10b981",
  downColor: "#f43f5e",
  wickUpColor: "#34d399",
  wickDownColor: "#fb7185",
});
const closeLine = chart.addSeries("line", {
  color: "#fbbf24",
  lineWidth: 2,
});

const initialCandles = generateCandles(120);
const initialLine = initialCandles.map((candle) => ({
  time: candle.time,
  value: candle.close,
}));

candles.setData(initialCandles);
closeLine.setData(initialLine);
chart.timeScale().fitContent();
chart.resize(container.clientWidth, container.clientHeight);

let liveIndex = 120;
let liveCandle = generateNextCandle();
let phase = 0;

setInterval(() => {
  if (phase < 3) {
    liveCandle = evolveCandle(liveCandle);
    candles.update(liveCandle);
    closeLine.update({
      time: liveCandle.time,
      value: liveCandle.close,
    });
    phase += 1;
    return;
  }

  candles.update(liveCandle);
  closeLine.update({
    time: liveCandle.time,
    value: liveCandle.close,
  });
  liveIndex += 1;
  liveCandle = generateNextCandle();
  phase = 0;
}, 900);

window.addEventListener("resize", () => {
  chart.resize(container.clientWidth, container.clientHeight);
});

function generateCandles(length) {
  const candlesData = [];
  let lastClose = 100;
  const startTime = Date.UTC(2024, 0, 1);
  const oneDay = 24 * 60 * 60 * 1000;

  for (let index = 0; index < length; index += 1) {
    const open = lastClose;
    const drift = Math.sin(index / 8) * 2;
    const close = open + drift + randomBetween(-3.5, 3.5);
    const high = Math.max(open, close) + randomBetween(0.5, 4);
    const low = Math.min(open, close) - randomBetween(0.5, 4);

    candlesData.push({
      time: startTime + index * oneDay,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round(randomBetween(1000, 5000)),
    });

    lastClose = close;
  }

  return candlesData;
}

function generateNextCandle() {
  const previous = liveIndex === 120 ? initialCandles.at(-1) : liveCandle;
  const open = previous ? previous.close : 100;
  const drift = Math.sin(liveIndex / 8) * 2;
  const close = open + drift + randomBetween(-2.5, 2.5);
  const high = Math.max(open, close) + randomBetween(0.4, 3);
  const low = Math.min(open, close) - randomBetween(0.4, 3);
  const startTime = Date.UTC(2024, 0, 1);
  const oneDay = 24 * 60 * 60 * 1000;

  return {
    time: startTime + liveIndex * oneDay,
    open: round(open),
    high: round(high),
    low: round(low),
    close: round(close),
    volume: Math.round(randomBetween(1000, 5000)),
  };
}

function evolveCandle(candle) {
  const close = candle.close + randomBetween(-1.25, 1.25);
  const high = Math.max(candle.open, close, candle.high);
  const low = Math.min(candle.open, close, candle.low);

  return {
    ...candle,
    high: round(high),
    low: round(low),
    close: round(close),
    volume: candle.volume + Math.round(randomBetween(100, 500)),
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function round(value) {
  return Math.round(value * 100) / 100;
}
