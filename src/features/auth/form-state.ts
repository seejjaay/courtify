/**
 * The shape every auth server action returns. Lives apart from the zod schemas so client
 * components can import it without pulling zod (~30 KB gzipped) into the browser bundle.
 */
export type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };
export const initialFormState: FormState = { ok: false };
