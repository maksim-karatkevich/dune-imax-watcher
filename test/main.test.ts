import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/main.ts";
import { loadSeen, saveSeen } from "../src/state.ts";
import type { Message } from "../src/types.ts";

/** Fake Cinema City API: one date, one matching showing (id "1") and one dubbed one. */
const fakeApi = (async (url: string | URL | Request) => {
  const u = String(url);
  if (u.includes("/dates/")) return Response.json({ body: { dates: ["2026-12-21"] } });
  return Response.json({
    body: {
      cinemas: [{ id: "1064", displayName: "Kraków - Zakopianka" }],
      events: [
        { id: "1", eventDateTime: "2026-12-21T19:45:00", attributeIds: ["imax", "subbed"], soldOut: false, availabilityRatio: 0.99, bookingLink: "https://x/1", cinemaId: "1064" },
        { id: "2", eventDateTime: "2026-12-21T10:00:00", attributeIds: ["imax", "dubbed"], soldOut: false, availabilityRatio: 0.99, bookingLink: "https://x/2", cinemaId: "1064" },
      ],
    },
  });
}) as typeof fetch;

async function statePath(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "dune-main-")), "seen.json");
}

test("first run sends one 'live' message and records current showings", async () => {
  const path = await statePath();
  const sent: Message[] = [];
  await run({ fetchFn: fakeApi, statePath: path, send: async (m) => void sent.push(m), log: () => {} });
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /live/i);
  assert.deepEqual(await loadSeen(path), new Set(["1"]));
});

test("a new showing triggers an alert and is recorded", async () => {
  const path = await statePath();
  await saveSeen(path, new Set(["old"]));
  const sent: Message[] = [];
  const { summary } = await run({ fetchFn: fakeApi, statePath: path, send: async (m) => void sent.push(m), log: () => {} });
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /1 new/);
  assert.deepEqual(await loadSeen(path), new Set(["old", "1"]));
  assert.match(summary, /1 new/);
});

test("nothing new sends nothing", async () => {
  const path = await statePath();
  await saveSeen(path, new Set(["1"]));
  const sent: Message[] = [];
  await run({ fetchFn: fakeApi, statePath: path, send: async (m) => void sent.push(m), log: () => {} });
  assert.equal(sent.length, 0);
});

test("if sending fails, state is NOT updated so the next run retries", async () => {
  const path = await statePath();
  await saveSeen(path, new Set(["old"]));
  await assert.rejects(
    run({ fetchFn: fakeApi, statePath: path, send: async () => { throw new Error("resend down"); }, log: () => {} }),
    /resend down/,
  );
  assert.deepEqual(await loadSeen(path), new Set(["old"]));
});
