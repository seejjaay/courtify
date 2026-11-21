// Top-down court geometry in metres: origin top-left, width along x, length along y.
// Every sport has exactly COURT_LINE_COUNT lines (unused ones are zero-length at the centre)
// so the landing page can morph one court into another line by line.
// Keep this file import-free with no TS-only runtime syntax: scripts/seed-photos.ts loads it
// with Node's type stripping.

export type SportSlug = 'pickleball' | 'badminton' | 'tennis' | 'padel' | 'table-tennis' | 'squash';
export type CourtLine = [x1: number, y1: number, x2: number, y2: number];
export type CourtSpec = { label: string; width: number; length: number; netY: number | null; lines: CourtLine[] };

export const COURT_LINE_COUNT = 16;

function court(label: string, width: number, length: number, netY: number | null, inner: CourtLine[]): CourtSpec {
  const lines: CourtLine[] = [
    [0, 0, width, 0],
    [0, length, width, length],
    [0, 0, 0, length],
    [width, 0, width, length],
    ...inner,
  ];
  const centre: CourtLine = [width / 2, length / 2, width / 2, length / 2];
  while (lines.length < COURT_LINE_COUNT) lines.push(centre);
  return { label, width, length, netY, lines };
}

export const COURT_SPECS: Record<SportSlug, CourtSpec> = {
  tennis: court('Tennis', 10.97, 23.77, 11.885, [
    [1.37, 0, 1.37, 23.77], // singles sidelines
    [9.6, 0, 9.6, 23.77],
    [1.37, 5.485, 9.6, 5.485], // service lines, 6.40 from the net
    [1.37, 18.285, 9.6, 18.285],
    [5.485, 5.485, 5.485, 18.285], // centre service line
    [5.485, 0, 5.485, 0.1], // centre marks
    [5.485, 23.77, 5.485, 23.67],
  ]),
  badminton: court('Badminton', 6.1, 13.4, 6.7, [
    [0.46, 0, 0.46, 13.4], // singles sidelines
    [5.64, 0, 5.64, 13.4],
    [0, 4.72, 6.1, 4.72], // short service lines, 1.98 from the net
    [0, 8.68, 6.1, 8.68],
    [0, 0.76, 6.1, 0.76], // doubles long service lines
    [0, 12.64, 6.1, 12.64],
    [3.05, 0, 3.05, 4.72], // centre lines
    [3.05, 8.68, 3.05, 13.4],
  ]),
  pickleball: court('Pickleball', 6.1, 13.41, 6.705, [
    [0, 4.575, 6.1, 4.575], // non-volley (kitchen) lines, 2.13 from the net
    [0, 8.835, 6.1, 8.835],
    [3.05, 0, 3.05, 4.575], // centre lines
    [3.05, 8.835, 3.05, 13.41],
  ]),
  padel: court('Padel', 10, 20, 10, [
    [0, 3.05, 10, 3.05], // service lines, 6.95 from the net
    [0, 16.95, 10, 16.95],
    [5, 3.05, 5, 16.95], // centre service line
  ]),
  'table-tennis': court('Table tennis', 1.525, 2.74, 1.37, [
    [0.7625, 0, 0.7625, 2.74], // centre line
  ]),
  squash: court('Squash', 6.4, 9.75, null, [
    [0, 5.44, 6.4, 5.44], // short line
    [3.2, 5.44, 3.2, 9.75], // half-court line
    [1.6, 5.44, 1.6, 7.04], // service boxes
    [0, 7.04, 1.6, 7.04],
    [4.8, 5.44, 4.8, 7.04],
    [4.8, 7.04, 6.4, 7.04],
  ]),
};
