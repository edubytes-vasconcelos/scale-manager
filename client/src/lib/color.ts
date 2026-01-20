export function getReadableEventColor(input?: string | null): string | undefined {
  if (!input) return undefined;
  const normalized = normalizeHex(input);
  if (!normalized) return undefined;
  const rgb = hexToRgb(normalized);
  if (!rgb) return undefined;

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  if (luminance > 0.7) {
    return darkenHex(normalized, 0.35);
  }

  return normalized;
}

type RGB = { r: number; g: number; b: number };

function normalizeHex(input: string): string | null {
  const value = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;
  if (value.length === 3) {
    return (
      "#" +
      value
        .split("")
        .map((ch) => ch + ch)
        .join("")
        .toLowerCase()
    );
  }
  return "#" + value.toLowerCase();
}

function hexToRgb(hex: string): RGB | null {
  const value = hex.replace("#", "");
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

function getLuminance(r: number, g: number, b: number): number {
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const r = clamp(rgb.r * (1 - amount));
  const g = clamp(rgb.g * (1 - amount));
  const b = clamp(rgb.b * (1 - amount));
  return (
    "#" +
    [r, g, b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")
  );
}
