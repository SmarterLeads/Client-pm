export function canViewClientCredentials(
  accountManagerId: string | null | undefined,
  teamMemberId: string | null | undefined,
  isAdminRole: boolean,
): boolean {
  if (!teamMemberId) return false;
  if (isAdminRole) return true;
  return Boolean(accountManagerId && accountManagerId === teamMemberId);
}
