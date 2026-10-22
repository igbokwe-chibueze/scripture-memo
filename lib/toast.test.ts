/** Sonner's public history API verifies timing without a DOM or real timers. */
import assert from "node:assert/strict";
import test from "node:test";
import { toast, ERROR_TOAST_DURATION_MS } from "./toast";

test("errors use ten seconds even when a legacy caller requests persistence", () => {
  const id = toast.error("Test failure", {
    id: "error-timing-regression",
    duration: Infinity,
    description: "Error code: BIB-001",
  });
  const entry = toast.getHistory().find((item) => item.id === id);
  assert.ok(entry && !("dismiss" in entry));
  assert.equal(entry.duration, ERROR_TOAST_DURATION_MS);
  assert.equal(entry.description, "Error code: BIB-001");
});

test("success timing and the ordinary callable Sonner API are preserved", () => {
  const id = toast.success("Saved", { duration: 4000 });
  const entry = toast.getHistory().find((item) => item.id === id);
  assert.ok(entry && !("dismiss" in entry));
  assert.equal(entry.duration, 4000);
  const plain = toast("Information", { duration: 4000 });
  assert.ok(toast.getHistory().some((item) => item.id === plain));
});
