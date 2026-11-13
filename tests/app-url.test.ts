import { describe, expect, it } from "vitest";
import { resolveQrBaseUrl } from "@/lib/app-url";

describe("QR base URL", () => {
  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000", "http://0.0.0.0:3000", "http://app.localhost:3000"])(
    "uses the deployed browser origin when the build contains %s",
    (configured) => {
      expect(resolveQrBaseUrl("https://cards.example.com:8443", configured)).toBe("https://cards.example.com:8443");
    },
  );

  it("preserves an explicitly configured public domain", () => {
    expect(resolveQrBaseUrl("https://preview.example.com", "https://cards.example.com/")).toBe("https://cards.example.com");
  });

  it("uses the active port during local development", () => {
    expect(resolveQrBaseUrl("http://localhost:3305", "http://localhost:3000")).toBe("http://localhost:3305");
  });
});
