import { ImageResponse } from 'next/og';

export const alt = 'Courtify: book racket courts near you, and run your venue from one screen';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand palette (see globals.css). ImageResponse can't read CSS variables.
const INK = '#2A1D14';
const CLAY = '#D1873A';
const CHALK = '#F8F6F2';
const SAND = '#D8A878';

/** Static share card: the court in chalk lines on clay, with the wordmark. Generated at build time. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: INK,
        color: CHALK,
        padding: 72,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          maxWidth: 560,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: CLAY,
            }}
          />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>Courtify</div>
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          Book courts. Run courts.
        </div>
        <div style={{ fontSize: 30, color: SAND, lineHeight: 1.3 }}>Pickleball, badminton, tennis, padel, table tennis and squash.</div>
      </div>
      <svg width="440" height="500" viewBox="0 0 440 500">
        <rect x="0" y="0" width="440" height="500" rx="28" fill={CLAY} />
        <g fill="none" stroke={CHALK} strokeWidth="6" strokeLinecap="round">
          <rect x="40" y="40" width="360" height="420" />
          <line x1="40" y1="250" x2="400" y2="250" strokeWidth="10" />
          <line x1="40" y1="150" x2="400" y2="150" />
          <line x1="40" y1="350" x2="400" y2="350" />
          <line x1="220" y1="40" x2="220" y2="150" />
          <line x1="220" y1="350" x2="220" y2="460" />
        </g>
        <circle cx="300" cy="200" r="16" fill={INK} />
      </svg>
    </div>,
    size,
  );
}
