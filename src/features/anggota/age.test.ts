import { describe, expect, it } from "vitest";
import { ageFlag } from "./age";

describe("batas usia Karang Taruna (13-45 tahun)", () => {
  const today = "2026-10-03";

  it("tanpa penanda untuk usia wajar atau tanggal lahir yang disembunyikan", () => {
    expect(ageFlag("2000-01-01", today)).toBeNull(); // 26 tahun
    expect(ageFlag(null, today)).toBeNull();
  });

  it("mendekati batas pada usia 44 dan 45", () => {
    expect(ageFlag("1982-10-04", today)).toBeNull(); // 43, ulang tahun ke-44 besok
    expect(ageFlag("1982-10-03", today)).toBe("mendekati"); // tepat 44
    expect(ageFlag("1981-10-03", today)).toBe("mendekati"); // tepat 45
    expect(ageFlag("1980-10-04", today)).toBe("mendekati"); // 45, genap 46 besok
  });

  it("melewati batas mulai usia 46", () => {
    expect(ageFlag("1980-10-03", today)).toBe("lewat");
    expect(ageFlag("1970-01-01", today)).toBe("lewat");
  });
});
