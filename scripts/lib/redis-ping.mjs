import { connect } from 'node:net';

/**
 * Sends AUTH + PING over the Redis protocol with plain node:net, so the healthcheck
 * needs no npm packages. Resolves true on "+PONG".
 */
export function redisPing(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve(false);
      return;
    }
    const password = decodeURIComponent(parsed.password);
    const username = decodeURIComponent(parsed.username);
    const socket = connect({ host: parsed.hostname, port: Number(parsed.port || 6379) });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    const bulk = (...parts) =>
      `*${parts.length}\r\n${parts.map((p) => `$${Buffer.byteLength(p)}\r\n${p}\r\n`).join('')}`;
    let buffer = '';
    socket.setTimeout(timeoutMs, () => done(false));
    socket.on('error', () => done(false));
    socket.on('connect', () => {
      const auth = password
        ? username
          ? bulk('AUTH', username, password)
          : bulk('AUTH', password)
        : '';
      socket.write(auth + bulk('PING'));
    });
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('-')) done(false);
      else if (buffer.includes('+PONG')) done(true);
    });
  });
}
