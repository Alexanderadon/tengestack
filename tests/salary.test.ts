import { describe, expect, it } from "vitest";
import { daysSinceEpoch, normalizeSalary } from "@scripts/lib/salary";

const FX = { KZT: 1, USD: 500, RUB: 6 };

describe("normalizeSalary", () => {
  it("KZT проходит как есть, mid = середина вилки", () => {
    const s = normalizeSalary({ from: 600_000, to: 900_000, currency: "KZT", gross: true }, FX);
    expect(s).toEqual({ from: 600_000, to: 900_000, mid: 750_000, gross: true, currency: "KZT" });
  });

  it("USD конвертируется по курсу", () => {
    const s = normalizeSalary({ from: 2000, to: 3000, currency: "USD", gross: false }, FX);
    expect(s.from).toBe(1_000_000);
    expect(s.to).toBe(1_500_000);
    expect(s.mid).toBe(1_250_000);
  });

  it("одна граница → mid равен ей", () => {
    expect(normalizeSalary({ from: 500_000, currency: "KZT" }, FX).mid).toBe(500_000);
    expect(normalizeSalary({ to: 700_000, currency: "KZT" }, FX).mid).toBe(700_000);
  });

  it("нет зарплаты → нули", () => {
    expect(normalizeSalary(null, FX).mid).toBe(0);
    expect(normalizeSalary({ from: null, to: null }, FX).mid).toBe(0);
  });

  it("неизвестная валюта → не врём курсом 1:1, а зануляем", () => {
    const s = normalizeSalary({ from: 1000, to: 2000, currency: "XYZ" }, FX);
    expect(s.mid).toBe(0);
    expect(s.currency).toBe("XYZ");
  });
});

describe("daysSinceEpoch", () => {
  it("считает дни по UTC", () => {
    expect(daysSinceEpoch("1970-01-02T00:00:00Z")).toBe(1);
    expect(daysSinceEpoch("2026-07-20T12:00:00+05:00")).toBe(
      Math.floor(Date.parse("2026-07-20T12:00:00+05:00") / 86_400_000),
    );
  });
});
