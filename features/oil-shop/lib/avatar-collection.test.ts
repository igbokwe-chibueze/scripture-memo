/** Collection receipts count usable inventory, not only shop purchases or visible offers. */
import assert from "node:assert/strict";
import test from "node:test";
import { getAvatarCollection } from "./avatar-collection";

test("the first avatar purchase adds to all three free portraits", () => {
  assert.deepEqual(getAvatarCollection([], "fox"), ["lion", "dove", "deer", "fox"]);
});

test("duplicates and free keys count once, while retired owned portraits remain included", () => {
  assert.deepEqual(getAvatarCollection(["lion", "owl", "fox", "owl"], "fox"), [
    "lion", "dove", "deer", "owl", "fox",
  ]);
  assert.equal(getAvatarCollection([]).length, 3);
});
