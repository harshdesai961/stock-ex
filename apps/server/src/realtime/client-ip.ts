/**
 * The caller's IP for rate limits (spec 12.2). X-Forwarded-For is trusted only when
 * TRUST_PROXY is on, and then only its last entry: the one our own proxy appended. Anything
 * earlier in the header was written by the client and could be anything.
 */
export function clientIp(
  handshake: { address: string; headers: Record<string, string | string[] | undefined> },
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const header = handshake.headers['x-forwarded-for'];
    const value = Array.isArray(header) ? header.at(-1) : header;
    const last = value?.split(',').at(-1)?.trim();
    if (last) return last;
  }
  return handshake.address;
}
