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

candles.setData(generateCandles(120));
chart.timeScale().fitContent();

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

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function round(value) {
  return Math.round(value * 100) / 100;
}
