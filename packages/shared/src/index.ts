// Public entry point, safe for browser bundles. Server-only code lives in subpaths so the
// browser never pulls it in: "./env" (environment validation) and "./socket-token" (signing).
export const PRODUCT_NAME = 'stock-ex';

export { formatNumber, formatRupees, formatSignedRupees } from './format.js';
export {
  SOCKET_MAX_MESSAGE_BYTES,
  SOCKET_TRANSPORTS,
  clientEvents,
  connectRefusalSchema,
  presencePingSchema,
  socketErrorCodeSchema,
  type Ack,
  type ClientEvent,
  type ClientToServerEvents,
  type ConnectRefusal,
  type PresencePong,
  type ServerToClientEvents,
  type SocketError,
  type SocketErrorCode,
} from './socket.js';
export {
  GUEST_ID_PATTERN,
  NICKNAME_MAX,
  guestTokenRequestSchema,
  nicknameSchema,
} from './guest.js';
export {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  cleanDisplayName,
  displayNameSchema,
  emailSchema,
  fieldErrors,
  forgotPasswordSchema,
  passwordSchema,
  passwordStrength,
  resetPasswordSchema,
  signInSchema,
  signUpRequestSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from './auth.js';
