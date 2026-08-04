/**
 * Names the two supported password-reset delivery environments.
 *
 * Better Auth always owns the reset token. This setting changes only how the
 * resulting reset URL reaches the account owner, allowing a production email
 * transport to replace the local download without changing the recovery flow.
 */
export const PASSWORD_RESET_DELIVERY_MODES = {
  LIGHT_DEV: "LIGHT_DEV",
  PROD: "PROD",
} as const;

export type PasswordResetDeliveryMode =
  (typeof PASSWORD_RESET_DELIVERY_MODES)[keyof typeof PASSWORD_RESET_DELIVERY_MODES];

