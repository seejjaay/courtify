/** Fixed ids and logins from supabase/seed.sql. Local stack and e2e only — never real accounts. */
export const SEED = {
  password: 'courtify-demo',
  users: {
    admin: 'a0000000-0000-4000-8000-000000000001',
    owner: 'a0000000-0000-4000-8000-000000000002',
    manager: 'a0000000-0000-4000-8000-000000000003',
    staff: 'a0000000-0000-4000-8000-000000000004',
    player: 'a0000000-0000-4000-8000-000000000005',
  },
  emails: {
    admin: 'admin@courtify.test',
    owner: 'owner@courtify.test',
    manager: 'manager@courtify.test',
    staff: 'staff@courtify.test',
    player: 'player@courtify.test',
  },
  venues: {
    terracottaRallyClub: 'b0000000-0000-4000-8000-000000000001',
    chalklinePickleYard: 'b0000000-0000-4000-8000-000000000002',
    shuttleAndSol: 'b0000000-0000-4000-8000-000000000003',
    kantoBaselineCourts: 'b0000000-0000-4000-8000-000000000004',
    arcoPadelTerraza: 'b0000000-0000-4000-8000-000000000005',
    lomaClayhouse: 'b0000000-0000-4000-8000-000000000006',
    sugboSmashHouse: 'b0000000-0000-4000-8000-000000000007',
    mactanBreezeCourts: 'b0000000-0000-4000-8000-000000000008',
    ermitaPingPongPlaza: 'b0000000-0000-4000-8000-000000000009',
    dinkDistrictMandaluyong: 'b0000000-0000-4000-8000-000000000010',
    ortigasSquashBox: 'b0000000-0000-4000-8000-000000000011',
    patioPadelTagaytay: 'b0000000-0000-4000-8000-000000000012',
  },
} as const;
