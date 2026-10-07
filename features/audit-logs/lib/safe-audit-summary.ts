/** Treats metadata from a persisted log as untrusted JSON. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts only the JSON primitive types expected for current settings. */
function isSafePrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean";
}

/**
 * Converts only an allowlisted platform-settings diff into display text.
 * Private fields and all event types without an explicit policy are omitted.
 */
export function getSafePlatformSettingsSummary(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;

  const previous = metadata.previous;
  const next = metadata.next;
  if (!isRecord(previous) || !isRecord(next)) return null;

  const labels = {
    defaultTranslation: "Default translation",
    baseGlowPoints: "Base Glow reward",
    defaultHintAllowance: "New-player hints",
    adminCooldownTestingEnabled: "Admin cooldown testing",
  } as const;

  const changes = Object.entries(labels).flatMap(([key, label]) => {
    const beforeValue = previous[key];
    const afterValue = next[key];
    if (
      isSafePrimitive(beforeValue) &&
      isSafePrimitive(afterValue) &&
      beforeValue !== afterValue
    ) {
      return [`${label}: ${String(beforeValue)} → ${String(afterValue)}`];
    }

    return [];
  });

  return changes.length > 0 ? changes.join(" · ") : null;
}
