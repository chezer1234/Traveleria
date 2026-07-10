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

// Tier 0 (issue #46): logging a single experience/landmark within a state/province.
// province_visit_id lets the client pre-generate the id for the auto-created
// user_provinces row (if the province wasn't already visited) so the local
// optimistic row and the server row share a PK — same invariant as every
// other Phase 5 mutation.
export const addProvinceExperienceSchema = z.object({
  id: clientIdSchema,
  experience_id: z.string().trim().min(1, 'experience_id is required'),
  visited_at: visitedAtSchema,
  province_visit_id: clientIdSchema,
});

// Territory score (issue #29): a single logged stay in a country. `days` is
// required; `visited_at` is optional (the user may not remember when). 36500 ≈
// 100 years — a generous sanity cap, not a real-world limit.
const daysSchema = z
  .number({ invalid_type_error: 'Days must be a number' })
  .int('Days must be a whole number')
  .min(1, 'Days must be at least 1')
  .max(36500, 'Days is unrealistically large');

export const addVisitSchema = z.object({
  id: clientIdSchema,
  country_code: countryCodeSchema,
  days: daysSchema,
  visited_at: visitedAtSchema,
});

// Per-province time logging (issue #46, Phase 2) — same shape as addVisitSchema.
export const addProvinceVisitSchema = z.object({
  id: clientIdSchema,
  province_code: z.string().trim().min(1, 'province_code is required'),
  days: daysSchema,
  visited_at: visitedAtSchema,
});

const hexColourSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be a 6-digit hex string e.g. #3b82f6');

const groupNameSchema = z.string().trim().min(1, 'Name is required').max(60, 'Name too long');

export const createGroupSchema = z.object({
  id: clientIdSchema,
  name: groupNameSchema,
  members: z
    .array(
      z.object({
        id: clientIdSchema,
        user_id: z.string().uuid(),
        primary_colour: hexColourSchema,
        secondary_colour: hexColourSchema,
      }),
    )
    .min(1, 'A group needs at least one other member'),
  creator_member_id: clientIdSchema,
  primary_colour: hexColourSchema,
  secondary_colour: hexColourSchema,
});

export const renameGroupSchema = z.object({ name: groupNameSchema });

// User-selectable styles (issue #60) — the three design directions in docs/designs.
export const updateStyleSchema = z.object({
  style: z.enum(['atlas', 'orbit', 'jetstream']),
});

export const addGroupMemberSchema = z.object({
  id: clientIdSchema,
  user_id: z.string().uuid(),
  primary_colour: hexColourSchema,
  secondary_colour: hexColourSchema,
});

export const updateColoursSchema = z.object({
  primary_colour: hexColourSchema,
  secondary_colour: hexColourSchema,
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
