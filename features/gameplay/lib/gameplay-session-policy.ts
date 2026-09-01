/**
 * Distinguishes the existing one-mode administrator probe from a full Vault
 * replay fixture. Both are marked as administrator tests so neither can alter
 * learner progression, but the Vault fixture must still traverse all five
 * ordered game modes.
 */
export function isSingleModeAdminTest(session: {
  isAdminTest: boolean;
  isVaultReplay: boolean;
}): boolean {
  return session.isAdminTest && !session.isVaultReplay;
}

/** Administrator fixtures must never unlock the normal Vault replay badge. */
export function shouldAwardVaultReplayBadge(session: {
  isAdminTest: boolean;
  isVaultReplay: boolean;
}): boolean {
  return session.isVaultReplay && !session.isAdminTest;
}
