"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OilShopContent } from "./oil-shop-content";
import type { OilShopData } from "../types/oil-shop.types";
import type { OilShopTransport } from "../types/oil-shop-transport.types";

type Scenario = "success" | "rejected" | "insufficient";

const scenarios: ReadonlyArray<{ value: Scenario; label: string }> = [
  { value: "success", label: "Purchase success" },
  { value: "rejected", label: "Reject once, then retry" },
  { value: "insufficient", label: "Insufficient balance" },
];

/** Fixed synthetic catalogue; amounts never reach a real purchase or ledger. */
function createData(scenario: Scenario): OilShopData {
  return {
    balance: scenario === "insufficient" ? 0 : 500,
    hintsRemaining: 5,
    purchasedHints: 0,
    items: [{
      id: "preview-hint-pack",
      name: "Traveler Pack",
      description: "Three sample hints for this test only.",
      cost: 125,
      hintQuantity: 3,
    }],
  };
}

/**
 * Simulates a delayed acknowledgement against disposable closure state. No
 * server actions, repositories, or credentials are imported. Rejection preserves
 * fixture balances; successful retries return the same result shape as production.
 */
function createTransport(data: OilShopData, scenario: Scenario): OilShopTransport {
  let balance = data.balance;
  let hintsRemaining = data.hintsRemaining;
  let purchasedHints = data.purchasedHints;
  let attempted = false;
  return {
    purchase: async ({ itemId }) => {
      const firstAttempt = !attempted;
      attempted = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      if (scenario === "rejected" && firstAttempt) {
        return { success: false, message: "Test purchase rejected. Retry to succeed." };
      }
      const item = data.items.find((candidate) => candidate.id === itemId);
      if (!item || balance < item.cost) {
        return { success: false, message: "Not enough sample Glow Points." };
      }
      balance -= item.cost;
      hintsRemaining += item.hintQuantity;
      purchasedHints += item.hintQuantity;
      return {
        success: true,
        message: "Sample purchase complete. Your real balance is unchanged.",
        data: { itemName: item.name, balance, hintsRemaining, purchasedHints },
      };
    },
    // Administrator diagnostics are hidden; still fail safely if invoked.
    verifyPurchase: async () => ({ success: false, message: "Unavailable in this preview." }),
    verifyBalance: async () => ({ success: false, message: "Unavailable in this preview." }),
  };
}

/** A keyed remount restores shop state, transport state, and pending overlays. */
function PreviewRun({ scenario }: { scenario: Scenario }): React.ReactNode {
  const [data] = useState(() => createData(scenario));
  const [transport] = useState(() => createTransport(data, scenario));
  return <OilShopContent initialData={data} transport={transport} />;
}

/** Ready-made mobile/desktop purchase-control QA without spending real currency. */
export function OilShopTestPreview(): React.ReactNode {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [run, setRun] = useState(0);
  return (
    <section id="oil-shop-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-black">Oil Shop control testing</h2>
      <p className="text-sm text-muted-foreground">
        At 375px, tap the sample pack and buy. Check pending feedback and disabled
        purchase/close controls. On desktop, use the detail-panel purchase button.
        Only sample balances change; the previously accepted celebration needs no retest.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((option) => (
          <Button
            key={option.value}
            variant={scenario === option.value ? "default" : "outline"}
            aria-pressed={scenario === option.value}
            onClick={() => {
              setScenario(option.value);
              setRun((current) => current + 1);
            }}
          >
            {option.label}
          </Button>
        ))}
        <Button variant="outline" onClick={() => setRun((current) => current + 1)}>
          Reset scenario
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Rejection keeps the sample balance unchanged; retry succeeds. Insufficient
        balance disables purchasing. Reset restores all samples.
      </p>
      <PreviewRun key={run} scenario={scenario} />
    </section>
  );
}
