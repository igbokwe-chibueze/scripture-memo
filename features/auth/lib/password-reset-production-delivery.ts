import "server-only";

export type ProductionPasswordResetMessage = {
  recipientEmail: string;
  resetUrl: string;
};

/**
 * Production email seam reserved for the future transactional mail provider.
 *
 * Better Auth supplies the already-secured URL. When Resend or another provider
 * is selected, only this adapter needs to send that URL; token generation,
 * expiry, validation, and password mutation must remain inside Better Auth.
 */
export async function sendProductionPasswordReset(
  message: ProductionPasswordResetMessage,
): Promise<void> {
  // Retain the typed argument so a future provider implementation can be added
  // without changing this public transport contract.
  void message;
  throw new Error(
    "PROD password-reset delivery is not configured. Add the email provider adapter first.",
  );
}
