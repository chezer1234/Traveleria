import { z } from 'zod';

// An identifier can be either a handle (^[a-z0-9][a-z0-9._-]{2,31}$) or an email.
// We deliberately keep the regexes separate and forgiving — the user probably typed
// one or the other, and we care about uniqueness, not purity.
const HANDLE_REGEX = /^[a-z0-9][a-z0-9._-]{2,31}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const identifierSchema = z
  .string()
  .trim()
  .min(3, 'Identifier must be at least 3 characters')
  .max(254, 'Identifier is too long')
  .refine(
    (v) => HANDLE_REGEX.test(v) || EMAIL_REGEX.test(v),
    'Must be a handle (letters, numbers, . _ -) or a valid email'
  );

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(256, 'Password is too long');

const countryCodeSchema = z
  .string()
  .length(2, 'Country code must be 2 letters')
  .transform((v) => v.toUpperCase());

const visitedAtSchema = z
  .string()
  .datetime({ offset: true })
  .optional()
  .nullable()
  .refine(
    (v) => !v || new Date(v).getTime() <= Date.now(),
    'Visit date cannot be in the future'
  );

export const signupSchema = z.object({
  identifier: identifierSchema,
  password: passwordSchema,
  home_country: countryCodeSchema,
});

export const signinSchema = z.object({
  identifier: z.string().trim().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

// Optional client-supplied UUID. Phase 5 (optimistic writes) generates a UUID
// in the browser so the local-SQLite row and the server row share a PK — that
// way the _changes echo from the sync loop is a no-op INSERT OR REPLACE instead
// of a duplicate. Server falls back to crypto.randomUUID() when omitted.
const clientIdSchema = z.string().uuid().optional();

export const addCountrySchema = z.object({
  id: clientIdSchema,
  country_code: countryCodeSchema,
  visited_at: visitedAtSchema,
});

export const addCitySchema = z.object({
  id: clientIdSchema,
  city_id: z.union([z.string(), z.number()]),
  visited_at: visitedAtSchema,
});

export const addProvinceSchema = z.object({
  id: clientIdSchema,
  province_code: z.string().trim().min(1, 'province_code is required'),
  visited_at: visitedAtSchema,
});

// Middleware factory: parse req.body through a schema, short-circuit with 422 on failure.
export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.body = parsed.data;
    next();
  };
}
