import { Button } from '@/components/ui/button';
import { signIn } from './actions';
import { initialFormState } from './form-state';

const DEMO_ROLES = ['admin', 'owner', 'manager', 'staff', 'player'] as const;

// A plain form action must resolve to void; signIn redirects on success and reports errors otherwise.
async function signInAsDemo(formData: FormData): Promise<void> {
  'use server';
  await signIn(initialFormState, formData);
}

/**
 * One-tap sign-in as each seeded demo account. Development builds only: in production this
 * renders nothing, and as a server component its credentials never reach the browser.
 */
export function DemoLogins() {
  if (process.env.NODE_ENV !== 'development') return null;
  return (
    <section aria-labelledby="demo-accounts" className="mt-6 rounded-card border border-dashed border-greige p-4">
      <h2 id="demo-accounts" className="text-sm font-medium text-ink">
        Demo accounts
      </h2>
      <p className="mt-1 text-xs text-ink-soft">Local seed only. Password: courtify-demo</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_ROLES.map((role) => (
          <form key={role} action={signInAsDemo}>
            <input type="hidden" name="email" value={`${role}@courtify.test`} />
            <input type="hidden" name="password" value="courtify-demo" />
            <Button type="submit" size="sm" variant="secondary" className="capitalize">
              {role}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
