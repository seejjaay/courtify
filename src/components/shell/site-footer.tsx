import Link from 'next/link';

const footerLink = 'inline-block rounded-sm py-1 text-ink-soft underline-offset-4 hover:text-ink hover:underline';

/** No runtime date: Cache Components prerenders the footer, so a year would freeze at build time. */
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-chalk">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-ink-soft">© Courtify</p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <Link href="/for-venues" className={footerLink}>
                For venues
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className={footerLink}>
                Terms
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className={footerLink}>
                Privacy
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
