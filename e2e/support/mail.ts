// Reads auth emails from the local stack's Mailpit (`npx supabase status` → MAILPIT_URL).
const MAILPIT = 'http://127.0.0.1:54324';
const seen = new Map<string, string>();

type SearchResult = { messages: { ID: string }[] };
type Message = { HTML: string; Text: string };

/**
 * The first /auth/v1/verify link in the newest email to `to` that this run hasn't used yet,
 * so asking twice (signup, then reset) waits for the second email instead of re-reading the first.
 */
export async function latestAuthLink(to: string): Promise<string> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const search = (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`).then((r) => r.json())) as SearchResult;
    const newest = search.messages?.[0]?.ID;
    if (newest && newest !== seen.get(to)) {
      const message = (await fetch(`${MAILPIT}/api/v1/message/${newest}`).then((r) => r.json())) as Message;
      const link = `${message.HTML} ${message.Text}`.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/)?.[0];
      if (link) {
        seen.set(to, newest);
        return link.replaceAll('&amp;', '&');
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No auth email reached ${to} within 10 s`);
}
