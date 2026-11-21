import { z } from 'zod';


const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.'));
const newPassword = z.string().min(8, 'Use at least 8 characters.').max(72, 'Use at most 72 characters.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80, 'Keep it under 80 characters.'),
  email,
  password: newPassword,
  consent: z.literal(true, 'Please accept the Terms and Privacy Policy to continue.'),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, { message: 'Passwords don’t match.', path: ['confirm'] });

/** Field errors keyed by input name, for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
