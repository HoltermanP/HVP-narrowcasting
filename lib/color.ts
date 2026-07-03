/** Kleurhulpjes voor de playerweergave: mengen binnen de huisstijlkleuren. */

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b))
    .toString(16)
    .padStart(6, "0")}`;
}

/** Mengt kleur a richting kleur b (t = 0..1). */
export function mixHex(a: string, b: string, t: number): string {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return a;
  return rgbToHex(
    rgbA[0] + (rgbB[0] - rgbA[0]) * t,
    rgbA[1] + (rgbB[1] - rgbA[1]) * t,
    rgbA[2] + (rgbB[2] - rgbA[2]) * t
  );
}

export function lighten(hex: string, amount: number): string {
  return mixHex(hex, "#ffffff", amount);
}

export function darken(hex: string, amount: number): string {
  return mixHex(hex, "#000000", amount);
}

/** Voegt een alpha-kanaal (2 hextekens) toe aan een #rrggbb-kleur. */
export function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}
