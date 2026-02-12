import { describe, it, expect } from "vitest";
import { detectDeviceType, detectOs, detectBrowser } from "./auth-access-audit";

describe("detectDeviceType", () => {
  it("detecta iPad como tablet", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)")).toBe("tablet");
  });

  it("detecta Kindle como tablet", () => {
    expect(detectDeviceType("Mozilla/5.0 (Linux; Android 4.4; Kindle Fire)")).toBe("tablet");
  });

  it("detecta Silk como tablet", () => {
    expect(detectDeviceType("Mozilla/5.0 (Linux; Android) Silk/100")).toBe("tablet");
  });

  it("detecta iPhone como mobile", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
    ).toBe("mobile");
  });

  it("detecta Android como mobile", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (Linux; Android 14; Pixel 8)")
    ).toBe("mobile");
  });

  it("detecta Windows Phone como mobile", () => {
    expect(
      detectDeviceType("Mozilla/5.0 (Windows Phone 10.0; ARM)")
    ).toBe("mobile");
  });

  it("detecta Chrome desktop como desktop", () => {
    expect(
      detectDeviceType(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0"
      )
    ).toBe("desktop");
  });

  it("detecta string vazia como desktop", () => {
    expect(detectDeviceType("")).toBe("desktop");
  });
});

describe("detectOs", () => {
  it("detecta Windows", () => {
    expect(
      detectOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    ).toBe("windows");
  });

  it("detecta Android", () => {
    expect(
      detectOs("Mozilla/5.0 (Linux; Android 14; Pixel 8)")
    ).toBe("android");
  });

  it("detecta iOS via iPhone", () => {
    expect(
      detectOs("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
    ).toBe("ios");
  });

  it("detecta iOS via iPad", () => {
    expect(
      detectOs("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)")
    ).toBe("ios");
  });

  it("detecta macOS", () => {
    expect(
      detectOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
    ).toBe("macos");
  });

  it("detecta Linux", () => {
    expect(
      detectOs("Mozilla/5.0 (X11; Linux x86_64)")
    ).toBe("linux");
  });

  it("retorna unknown para UA desconhecido", () => {
    expect(detectOs("SomeBot/1.0")).toBe("unknown");
  });
});

describe("detectBrowser", () => {
  it("detecta Edge (antes do Chrome)", () => {
    expect(
      detectBrowser(
        "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Edg/120.0"
      )
    ).toBe("edge");
  });

  it("detecta Opera via opr/", () => {
    expect(
      detectBrowser("Mozilla/5.0 Chrome/120.0 OPR/106.0")
    ).toBe("opera");
  });

  it("detecta Opera via opera", () => {
    expect(
      detectBrowser("Opera/9.80 (Windows NT 6.1)")
    ).toBe("opera");
  });

  it("detecta Firefox", () => {
    expect(
      detectBrowser("Mozilla/5.0 (Windows NT 10.0) Firefox/121.0")
    ).toBe("firefox");
  });

  it("detecta Chrome", () => {
    expect(
      detectBrowser("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36")
    ).toBe("chrome");
  });

  it("detecta Safari (sem Chrome no UA)", () => {
    expect(
      detectBrowser("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15")
    ).toBe("safari");
  });

  it("retorna unknown para UA desconhecido", () => {
    expect(detectBrowser("SomeBot/1.0")).toBe("unknown");
  });

  it("prioridade: Edge > Chrome (Edge UA contém Chrome)", () => {
    const edgeUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(detectBrowser(edgeUA)).toBe("edge");
  });

  it("prioridade: Opera > Chrome (Opera UA contém Chrome)", () => {
    const operaUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";
    expect(detectBrowser(operaUA)).toBe("opera");
  });
});
