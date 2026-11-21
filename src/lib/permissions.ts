/** Per-venue roles. Mirrors the `member_role` enum and `member_role_rank()` in SQL. */
export type VenueRole = 'owner' | 'manager' | 'staff';

const RANK: Record<VenueRole, number> = { staff: 1, manager: 2, owner: 3 };

export function roleAtLeast(role: VenueRole | null | undefined, min: VenueRole): boolean {
  return role != null && RANK[role] >= RANK[min];
}
