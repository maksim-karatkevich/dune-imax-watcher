import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSeen, saveSeen } from "../src/state.ts";

async function tempFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "dune-watcher-")), "seen.json");
}

test("loadSeen returns null when there is no state file yet (first run)", async () => {
  assert.equal(await loadSeen(await tempFile()), null);
});

test("saveSeen then loadSeen round-trips the ids", async () => {
  const path = await tempFile();
  await saveSeen(path, new Set(["b", "a"]));
  assert.deepEqual(await loadSeen(path), new Set(["a", "b"]));
});

test("saved file is sorted and ends with a newline, so unchanged state gives no git diff", async () => {
  const path = await tempFile();
  await saveSeen(path, new Set(["2", "10", "1"]));
  assert.equal(await readFile(path, "utf8"), '{\n  "ids": [\n    "1",\n    "10",\n    "2"\n  ]\n}\n');
});
