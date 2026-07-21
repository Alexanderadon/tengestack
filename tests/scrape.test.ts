import { describe, expect, it } from "vitest";
import { luxToItem, parseLuxState } from "@scripts/lib/scrape";

/** Мини-фрагмент HH-Lux-InitialState с реальной вложенной структурой полей. */
const FIXTURE_HTML = `<html><body>
<template style="display:none" id="HH-Lux-InitialState">${escapeEntities(
  JSON.stringify({
    vacancySearchResult: {
      totalResults: 64,
      vacancies: [
        {
          vacancyId: 135217984,
          name: "Middle Frontend-разработчик",
          area: { "@id": 160, name: "Алматы", path: ".40.160." },
          company: { name: "Kolesa" },
          compensation: { from: 800000, to: 1300000, currencyCode: "KZT", gross: false, mode: "MONTH" },
          publicationTime: { "@timestamp": 1752566962 },
          workExperience: "between1And3",
          workFormats: [{ workFormatsElement: ["ON_SITE", "HYBRID"] }],
          "@workSchedule": "fullDay",
          professionalRoleIds: [{ professionalRoleId: [96] }],
        },
        {
          vacancyId: 999,
          name: "QA Engineer",
          area: { "@id": 160, name: "Астана" },
          company: { name: "NomadPay" },
          compensation: null,
          publicationTime: { "@timestamp": 1752566000 },
          workExperience: "noExperience",
          workFormats: [{ workFormatsElement: ["REMOTE"] }],
          "@workSchedule": "remote",
          professionalRoleIds: [{ professionalRoleId: [124] }],
        },
      ],
    },
  }),
)}</template>
</body></html>`;

function escapeEntities(json: string): string {
  return json.replace(/"/g, "&#34;").replace(/'/g, "&#39;");
}

describe("parseLuxState", () => {
  it("достаёт стейт из template и декодирует числовые сущности", () => {
    const state = parseLuxState(FIXTURE_HTML);
    expect(state?.vacancySearchResult?.totalResults).toBe(64);
    expect(state?.vacancySearchResult?.vacancies?.length).toBe(2);
  });

  it("нет template → null, а не исключение", () => {
    expect(parseLuxState("<html>ничего</html>")).toBeNull();
  });
});

describe("luxToItem", () => {
  const state = parseLuxState(FIXTURE_HTML)!;
  const [v0, v1] = state.vacancySearchResult!.vacancies!;

  it("маппит зарплату с реальным gross и валютой", () => {
    const it = luxToItem(v0);
    expect(it.salary).toEqual({ from: 800000, to: 1300000, currency: "KZT", gross: false });
  });

  it("разворачивает вложенные роли и форматы работы", () => {
    const it = luxToItem(v0);
    expect(it.professional_roles).toEqual([{ id: "96" }]);
    expect(it.work_format).toEqual([{ id: "ON_SITE" }, { id: "HYBRID" }]);
  });

  it("timestamp → ISO", () => {
    const it = luxToItem(v0);
    expect(it.published_at).toBe(new Date(1752566962 * 1000).toISOString());
  });

  it("нет зарплаты → salary null", () => {
    expect(luxToItem(v1).salary).toBeNull();
  });

  it("город и работодатель на месте", () => {
    const it = luxToItem(v1);
    expect(it.area?.name).toBe("Астана");
    expect(it.employer?.name).toBe("NomadPay");
  });
});
