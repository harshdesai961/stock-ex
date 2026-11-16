// Public entry point. Socket contracts and game DTO schemas arrive in M2;
// environment validation lives in the "./env" subpath so browser bundles never pull it in.
export const PRODUCT_NAME = 'stock-ex';

export { formatNumber, formatRupees, formatSignedRupees } from './format.js';
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
