import assert from "node:assert/strict";
import test from "node:test";
import {
  AVATAR_CATALOG,
  AVATAR_FRAME_KEYS,
  normalizeAvatarFrameKey,
  normalizeAvatarKey,
} from "@/features/profile/data/avatar-catalog";

test("the player avatar catalog contains twelve independent animals", () => {
  assert.equal(AVATAR_CATALOG.length, 12);
  assert.equal(
    new Set(AVATAR_CATALOG.map((avatar) => avatar.imagePath)).size,
    12,
  );
});

test("unknown stored presentation keys fall back safely", () => {
  assert.equal(normalizeAvatarKey("unknown"), "lion");
  assert.equal(normalizeAvatarFrameKey("unknown"), "default");
  assert.equal(AVATAR_FRAME_KEYS.length, 7);
});
