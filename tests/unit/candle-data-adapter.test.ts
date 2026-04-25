import { describe, expect, it } from "vitest";
import { createCandleBuffer } from "../../src/data/adapters/candle-data-adapter";

describe("createCandleBuffer", () => {
  it("normalizes public candle data into typed arrays", () => {
    const buffer = createCandleBuffer([
      {
        time: new Date("2024-01-01T00:00:00.000Z"),
        open: 10,
        high: 15,
        low: 8,
        close: 12,
        volume: 100,
      },
      {
        time: 1704153600000,
        open: 12,
        high: 18,
        low: 11,
        close: 16,
      },
    ]);

    expect(buffer.length).toBe(2);
    expect(Array.from(buffer.time)).toEqual([
      1704067200000,
      1704153600000,
    ]);
    expect(Array.from(buffer.open)).toEqual([10, 12]);
    expect(Array.from(buffer.high)).toEqual([15, 18]);
    expect(Array.from(buffer.low)).toEqual([8, 11]);
    expect(Array.from(buffer.close)).toEqual([12, 16]);
    expect(Array.from(buffer.volume)).toEqual([100, 0]);
  });

  it("throws when candle values are invalid", () => {
    expect(() =>
      createCandleBuffer([
        {
          time: 1,
          open: 10,
          high: 5,
          low: 8,
          close: 9,
        },
      ]),
    ).toThrow("Candle high must be >= low at index 0.");
  });
});
