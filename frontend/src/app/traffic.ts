import { turn } from './geo';

export interface Observation {
  observedAt: number; lon: number; lat: number;
  altitudeFt: number | null; speedKt: number | null; track: number | null; heading: number | null;
}
export interface Aircraft extends Observation {
  id: string; callsign: string; registration: string | null;
  airline: string | null; operator: string | null; aircraftType: string | null;
  category?: string | null;
  stale?: boolean;
}
export interface ReplayAircraft extends Omit<Aircraft, keyof Observation | 'stale'> { samples: Observation[]; }
export interface Replay { mode: 'simulation'; credit: string; start: number; end: number; aircraft: ReplayAircraft[]; }

/** Interpolate observations only; never extrapolate past the newest position. */
export function interpolate(samples: Observation[], time: number): Observation & { stale: boolean } {
  const first = samples[0];
  if (!first) throw new Error('Missing observations');
  if (time <= first.observedAt) return { ...first, stale: false };
  const index = samples.findIndex(s => s.observedAt >= time);
  if (index < 0) {
    const last = samples[samples.length - 1];
    return { ...last, stale: time - last.observedAt > 30_000 };
  }
  const a = samples[index - 1], b = samples[index];
  if (b.observedAt - a.observedAt > 60_000) return { ...a, stale: time - a.observedAt > 30_000 };
  const t = (time - a.observedAt) / (b.observedAt - a.observedAt);
  const number = (x: number | null, y: number | null) => x === null || y === null ? x : x + (y - x) * t;
  const angle = (x: number | null, y: number | null) => x === null || y === null ? x : turn(x, y, t);
  return { observedAt: a.observedAt, lon: a.lon + ((b.lon - a.lon + 540) % 360 - 180) * t, lat: a.lat + (b.lat - a.lat) * t,
    altitudeFt: number(a.altitudeFt, b.altitudeFt), speedKt: number(a.speedKt, b.speedKt), track: angle(a.track, b.track), heading: angle(a.heading, b.heading), stale: false };
}

export function replayAt(replay: Replay, time: number): Aircraft[] {
  return replay.aircraft.map(({ samples, ...identity }) => ({ ...identity, ...interpolate(samples, time) }));
}
