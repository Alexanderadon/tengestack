import { describe, expect, it } from "vitest";
import { buildHistogram, groupMedians, percentileSorted } from "@/shared/lib/stats";

describe("percentileSorted", () => {
  it("медиана чётного и нечётного", () => {
    expect(percentileSorted([1, 2, 3], 50)).toBe(2);
    expect(percentileSorted([1, 2, 3, 4], 50)).toBe(2.5);
  });

  it("края", () => {
    expect(percentileSorted([5, 10, 20], 0)).toBe(5);
    expect(percentileSorted([5, 10, 20], 100)).toBe(20);
    expect(percentileSorted([], 50)).toBe(0);
  });
});

describe("buildHistogram", () => {
  it("бины покрывают значения, сумма не теряет строк в центре", () => {
    const values = Array.from({ length: 1000 }, (_, i) => 300_000 + i * 1000);
    const { bins, maxCount } = buildHistogram(values);
    expect(bins.length).toBeGreaterThan(10);
    expect(maxCount).toBeGreaterThan(0);
    const total = bins.reduce((s, b) => s + b.count, 0);
    // хвосты обрезаны перцентилями → теряем не больше 3%
    expect(total).toBeGreaterThan(970);
  });

  it("выброс не сплющивает гистограмму", () => {
    const values = [...Array.from({ length: 500 }, () => 500_000 + Math.floor(Math.random() * 400_000)), 30_000_000];
    const { bins } = buildHistogram(values);
    const span = bins[bins.length - 1]!.x1 - bins[0]!.x0;
    expect(span).toBeLessThan(5_000_000);
  });
});

describe("groupMedians", () => {
  it("медианы по группам, сортировка по убыванию", () => {
    // группа 0: [100, 300] → 200; группа 1: [500] → 500
    const groups = [0, 0, 1, 0];
    const salaries = [100, 300, 500, 0];
    const idx = Uint32Array.from([0, 1, 2, 3]);
    const out = groupMedians(idx, (i) => groups[i]!, (i) => salaries[i]!);
    expect(out[0]).toMatchObject({ key: 1, median: 500, count: 1, withSalary: 1 });
    expect(out[1]).toMatchObject({ key: 0, median: 200, count: 3, withSalary: 2 });
  });
});
