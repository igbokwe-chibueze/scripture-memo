/** Search text cannot turn a literal prefix into a broad wildcard directory scan. */
import assert from "node:assert/strict";
import test from "node:test";
import { escapePlayerSearch } from "./escape-player-search";

test("prefix wildcard characters are escaped while ordinary names stay unchanged", () => {
  assert.equal(escapePlayerSearch("amara_grace"), "amara\\_grace");
  assert.equal(escapePlayerSearch("__%\\"), "\\_\\_\\%\\\\");
  assert.equal(escapePlayerSearch("Amara Grace"), "Amara Grace");
});
