// Tiny console helpers for the setup scripts (Node built-ins only).
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\u001b[${code}m${text}\u001b[0m` : text);

export const ok = (text) => console.log(`${paint(32, '✔')} ${text}`);
export const fail = (text) => console.log(`${paint(31, '✘')} ${text}`);
export const warn = (text) => console.log(`${paint(33, '!')} ${text}`);
export const step = (text) => console.log(`\n${paint(36, '▸')} ${paint(1, text)}`);
export const hint = (text) => console.log(`  ${paint(2, text)}`);
