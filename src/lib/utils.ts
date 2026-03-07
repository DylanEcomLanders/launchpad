/** Generate a short random ID (e.g. "temp-k3f8m2x") */
export function uid(): string {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

/** Return today's date as YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
