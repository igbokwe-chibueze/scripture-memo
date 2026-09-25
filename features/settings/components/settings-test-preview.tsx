"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsFormContent } from "./settings-form-content";
import type { UpdateUserSettingsInput } from "../schemas/update-user-settings.schema";
import type { ActionResult } from "@/types/api";

/** Synthetic preferences never reach a server action or browser preference store. */
const sample: UpdateUserSettingsInput = {
  displayName: "Sample Learner",
  countryCode: "",
  avatarKey: "lion",
  avatarFrameKey: "default",
  preferredTranslation: "KJV",
  locale: "en",
  audioEnabled: true,
  reducedMotion: false,
  theme: "system",
  timeZone: "UTC",
};

type Scenario = "success" | "rejected" | "connection";

/** A fresh keyed run resets attempts and the disposable form draft together. */
function SettingsPreviewRun({ scenario }: { scenario: Scenario }): React.ReactNode {
  const attempts = useRef(0);

  async function save(): Promise<ActionResult> {
    const first = attempts.current++ === 0;
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    if (first && scenario === "connection") throw new Error("Simulated connection failure");
    if (first && scenario === "rejected") {
      return { success: false, message: "Sample save rejected. Your draft is kept; retry to save." };
    }
    return { success: true, message: "Sample settings saved. Your real preferences are unchanged." };
  }

  return (
    <SettingsFormContent
      initialValues={sample}
      isPartner={false}
      save={save}
      onSaved={() => {
        // QA deliberately skips production theme, language, motion and refresh effects.
      }}
    />
  );
}

/** Ready-made save/retry checks using the production form and in-memory responses. */
export function SettingsTestPreview(): React.ReactNode {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [run, setRun] = useState(0);

  return (
    <section id="settings-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-bold">Settings save testing</h2>
      <p className="text-sm text-muted-foreground">
        Edit the sample name, then save. All fields should lock while saving.
        Rejection and connection failure keep your draft; retry succeeds.
        A successful save disables Save until another edit. No real preferences change.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["success", "Success"],
          ["rejected", "Reject once, then retry"],
          ["connection", "Connection failure, then retry"],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            variant={scenario === value ? "default" : "outline"}
            aria-pressed={scenario === value}
            onClick={() => {
              setScenario(value);
              setRun((current) => current + 1);
            }}
          >
            {label}
          </Button>
        ))}
        <Button variant="outline" onClick={() => setRun((current) => current + 1)}>
          Reset scenario
        </Button>
      </div>
      <SettingsPreviewRun key={run} scenario={scenario} />
    </section>
  );
}
