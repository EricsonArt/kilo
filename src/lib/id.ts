/** Random id. `crypto.randomUUID` is missing on plain http (LAN testing), so fall back. */
export const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
