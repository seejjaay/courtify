// Renders a placeholder court photo for every venue_photos row and uploads it to the
// venue-photos bucket as {path}-{480|960|1600}.webp. Runs after `supabase db reset` (see
// `npm run db:reset`), with the local stack's keys from .env.local. Node runs this file
// directly with type stripping, so it sticks to erasable TypeScript.
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { COURT_SPECS, type SportSlug } from '../src/components/brand/court-specs.ts';

const WIDTHS = [480, 960, 1600] as const;
const W = 1600;
const H = 1067;
const CHALK = '#F8F6F2';
const INK = '#2A1D14';
const SURFACES = [
  { court: '#D1873A', surround: '#B9692B' }, // clay
  { court: '#D8A878', surround: '#C39059' }, // sand
];

/** FNV-1a: a stable number per photo, so a re-run renders the same image. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A top-down court on clay or sand, at a per-photo angle, with one long sun shadow from the top-left. */
function courtScene(sport: SportSlug, seed: number): string {
  const spec = COURT_SPECS[sport];
  const { court, surround } = SURFACES[seed % SURFACES.length];
  const angle = 90 + [-28, -16, -6, 9, 21][seed % 5];
  const theta = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(theta));
  const sin = Math.abs(Math.sin(theta));
  const runOff = 1;
  const boxW = (spec.width + 2 * runOff) * cos + (spec.length + 2 * runOff) * sin;
  const boxH = (spec.width + 2 * runOff) * sin + (spec.length + 2 * runOff) * cos;
  const scale = Math.min((W * 0.9) / boxW, (H * 0.9) / boxH);
  const stroke = Math.max(0.05, 3 / scale); // metres, never thinner than about 3px

  const lines = spec.lines
    .filter(([x1, y1, x2, y2]) => x1 !== x2 || y1 !== y2) // unused entries are zero-length
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`)
    .join('');
  const net =
    spec.netY === null
      ? ''
      : `<line x1="-0.6" y1="${spec.netY}" x2="${spec.width + 0.6}" y2="${spec.netY}" stroke="${INK}" stroke-opacity="0.6" ` +
        `stroke-width="${stroke * 1.4}" stroke-dasharray="${stroke * 3} ${stroke * 2}"/>`;

  const edge = W * (0.42 + (seed % 3) * 0.08);
  const shadow = `<polygon points="${edge},0 ${W},0 ${W},${H} ${edge - W * 0.6},${H}" fill="${INK}" fill-opacity="0.2"/>`;
  const posts = [0.1, 0.19, 0.28]
    .map((t) => `<line x1="${edge - W * t}" y1="0" x2="${edge - W * t - W * 0.6}" y2="${H}" stroke="${INK}" stroke-opacity="0.1" stroke-width="14"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF6E6" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${INK}" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${surround}"/>
  <g transform="translate(${W / 2} ${H / 2}) rotate(${angle}) scale(${scale}) translate(${-spec.width / 2} ${-spec.length / 2})">
    <rect x="${-runOff}" y="${-runOff}" width="${spec.width + 2 * runOff}" height="${spec.length + 2 * runOff}" fill="${court}"/>
    <g stroke="${CHALK}" stroke-width="${stroke}" stroke-linecap="square" fill="none">
      <rect x="0" y="0" width="${spec.width}" height="${spec.length}"/>
      ${lines}
    </g>
    ${net}
  </g>
  ${posts}
  ${shadow}
  <rect width="${W}" height="${H}" fill="url(#light)"/>
</svg>`;
}

async function main(): Promise<void> {
  process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
  }
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: photos, error: photosError } = await admin
    .from('venue_photos')
    .select('id, path, venue_id')
    .order('venue_id')
    .order('sort');
  if (photosError) throw photosError;

  const { data: courts, error: courtsError } = await admin.from('courts').select('venue_id, sort, sports(slug)').order('sort');
  if (courtsError) throw courtsError;

  // The venue's first court decides which sport its photos show.
  const sportByVenue = new Map<string, SportSlug>();
  for (const court of courts) {
    const slug = court.sports?.slug as SportSlug | undefined;
    if (slug && !sportByVenue.has(court.venue_id)) sportByVenue.set(court.venue_id, slug);
  }

  for (const photo of photos) {
    const svg = Buffer.from(courtScene(sportByVenue.get(photo.venue_id) ?? 'tennis', hash(photo.id)));
    await Promise.all(
      WIDTHS.map(async (width) => {
        const file = await sharp(svg).resize({ width }).webp({ quality: 80 }).toBuffer();
        const { error } = await admin.storage
          .from('venue-photos')
          .upload(`${photo.path}-${width}.webp`, file, { upsert: true, cacheControl: '31536000', contentType: 'image/webp' });
        if (error) throw new Error(`${photo.path}-${width}.webp: ${error.message}`);
      }),
    );
  }

  console.log(`seed-photos: uploaded ${photos.length} photos at ${WIDTHS.join(', ')} px`);
}

main().catch((error: unknown) => {
  console.error('seed-photos failed:', error);
  process.exit(1);
});
