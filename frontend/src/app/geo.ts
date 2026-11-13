export type Point = [number, number];
const rad = Math.PI / 180;
export function distanceKm(a: Point, b: Point): number {
  const h = Math.sin((b[1] - a[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function bearing(a: Point, b: Point): number {
  const dl = (b[0] - a[0]) * rad;
  return (Math.atan2(Math.sin(dl) * Math.cos(b[1] * rad), Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos(dl)) / rad + 360) % 360;
}
export function turn(from: number, to: number, fraction: number): number {
  return (from + ((to - from + 540) % 360 - 180) * fraction + 360) % 360;
}
