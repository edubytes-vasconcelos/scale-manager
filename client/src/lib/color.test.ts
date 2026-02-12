import { describe, it, expect } from "vitest";
import { getReadableEventColor } from "./color";

describe("getReadableEventColor", () => {
  it("retorna undefined para null", () => {
    expect(getReadableEventColor(null)).toBeUndefined();
  });

  it("retorna undefined para undefined", () => {
    expect(getReadableEventColor(undefined)).toBeUndefined();
  });

  it("retorna undefined para string vazia", () => {
    expect(getReadableEventColor("")).toBeUndefined();
  });

  it("retorna undefined para hex inválido", () => {
    expect(getReadableEventColor("zzz")).toBeUndefined();
    expect(getReadableEventColor("12345")).toBeUndefined();
    expect(getReadableEventColor("xyz123")).toBeUndefined();
  });

  it("cor escura (#000000) retorna inalterada", () => {
    expect(getReadableEventColor("#000000")).toBe("#000000");
  });

  it("cor escura (#1a1a2e) retorna inalterada", () => {
    expect(getReadableEventColor("#1a1a2e")).toBe("#1a1a2e");
  });

  it("cor média (#3b82f6) retorna inalterada (luminância < 0.7)", () => {
    const result = getReadableEventColor("#3b82f6");
    expect(result).toBe("#3b82f6");
  });

  it("cor clara (#ffffff) é escurecida", () => {
    const result = getReadableEventColor("#ffffff");
    expect(result).not.toBe("#ffffff");
    // #ffffff escurecida 35% → cada canal: 255 * 0.65 = 165.75 → 166 → #a6a6a6
    expect(result).toBe("#a6a6a6");
  });

  it("cor amarela clara (#ffff00) é escurecida (alta luminância)", () => {
    const result = getReadableEventColor("#ffff00");
    expect(result).not.toBe("#ffff00");
  });

  it("normaliza hex de 3 chars (#fff → #ffffff → escurece)", () => {
    const result = getReadableEventColor("#fff");
    expect(result).toBe("#a6a6a6");
  });

  it("normaliza hex sem # (3b82f6)", () => {
    expect(getReadableEventColor("3b82f6")).toBe("#3b82f6");
  });

  it("normaliza hex de 3 chars sem # (abc)", () => {
    const result = getReadableEventColor("abc");
    // abc → #aabbcc → normalizado e verificado luminância
    expect(result).toBeDefined();
    expect(result!.startsWith("#")).toBe(true);
    expect(result!.length).toBe(7);
  });

  it("hex em maiúscula é normalizado", () => {
    expect(getReadableEventColor("#FF0000")).toBe("#ff0000");
  });

  it("hex com espaços é tratado", () => {
    expect(getReadableEventColor("  #ff0000  ")).toBe("#ff0000");
  });
});
