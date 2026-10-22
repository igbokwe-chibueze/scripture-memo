/** Expected social conflicts carry translation keys; never expose database errors. */
export class PlayerSocialConflictError extends Error {
  constructor(
    readonly reason:
      | "unavailable"
      | "invalidTransition"
      | "usernameTaken"
      | "usernameCooldown"
      | "rateLimited",
  ) {
    super(reason);
    this.name = "PlayerSocialConflictError";
  }
}
