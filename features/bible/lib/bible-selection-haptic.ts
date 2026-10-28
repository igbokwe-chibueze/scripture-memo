/** Give deliberate verse selections one short 30ms pulse on supported devices.
 * This optional browser-only effect never requests persistence or network work.
 * Missing hardware, blocked vibration and unsupported browsers must not prevent
 * selection or display an error for decorative feedback the player cannot fix.
 */
export function pulseBibleSelection(): void {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  try {
    navigator.vibrate(30);
  } catch {
    // Browser/device policy can deny vibration; verse selection still succeeds.
  }
}
