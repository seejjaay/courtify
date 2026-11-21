/** First tab stop on every page. Targets the <main id="main" tabIndex={-1}> that every layout renders. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-medium text-chalk focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
