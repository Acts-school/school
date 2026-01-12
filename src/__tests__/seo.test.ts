import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("robots route", () => {
  it("returns allow all rule and sitemap url", () => {
    const res = robots();
    if (Array.isArray(res.rules)) {
      expect(res.rules.length).toBeGreaterThan(0);
      const first = res.rules[0];
      const ua = Array.isArray(first?.userAgent) ? first.userAgent[0] : first?.userAgent;
      const allow = Array.isArray(first?.allow) ? first.allow[0] : first?.allow;
      expect(ua).toBe("*");
      expect(allow).toBe("/");
    } else {
      const ua = Array.isArray(res.rules.userAgent) ? res.rules.userAgent[0] : res.rules.userAgent;
      const allow = Array.isArray(res.rules.allow) ? res.rules.allow[0] : res.rules.allow;
      expect(ua).toBe("*");
      expect(allow).toBe("/");
    }
    expect((res.sitemap ?? []).length).toBeGreaterThan(0);
  });
});

describe("sitemap route", () => {
  it("contains base routes", () => {
    const res = sitemap();
    const urls = res.map((r) => r.url);
    expect(urls).toContain(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/`);
  });
});
