import { appendFile } from "node:fs/promises";
import { fetchDates, fetchEvents } from "./cinemaApi.ts";
import { findNew, formatAlert, formatLive, renderSummary, selectMatching } from "./logic.ts";
import { sendAll } from "./notify.ts";
import { loadSeen, saveSeen } from "./state.ts";
import type { Message, Showing } from "./types.ts";

export type Deps = {
  fetchFn: typeof fetch;
  statePath: string;
  send: (msg: Message) => Promise<void>;
  log: (line: string) => void;
};

export async function run(deps: Deps): Promise<{ summary: string }> {
  const { fetchFn, statePath, send, log } = deps;

  // 1. Fetch everything on sale and keep IMAX + subtitled showings.
  const dates = await fetchDates(fetchFn);
  log(`Fetched ${dates.length} date(s) on sale: ${dates.join(", ") || "none"}`);
  const byId = new Map<string, Showing>();
  for (const date of dates) {
    const { events, cinemas } = await fetchEvents(date, fetchFn);
    for (const s of selectMatching(events, cinemas)) byId.set(s.id, s);
  }
  const all = [...byId.values()].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  log(`Matching showings (IMAX, EN + PL subs): ${all.length}`);

  // 2. Compare with what we've already seen.
  const seen = await loadSeen(statePath);
  let message: Message | null = null;
  let newOnes: Showing[] = [];
  if (seen === null) {
    log("No state yet: first run, sending a 'watcher is live' message");
    message = formatLive(all);
  } else {
    newOnes = findNew(all, seen);
    log(`New showings: ${newOnes.length}`);
    if (newOnes.length > 0) message = formatAlert(newOnes);
  }

  // 3. Notify. If this throws, we stop here and do NOT save, so the next run retries.
  if (message) {
    await send(message);
    log(`Sent: ${message.title}`);
  }

  // 4. Only now record the showings as seen.
  await saveSeen(statePath, new Set([...(seen ?? []), ...all.map((s) => s.id)]));

  const summary = renderSummary({
    checkedAt: new Date(),
    dates,
    all,
    newIds: new Set(newOnes.map((s) => s.id)),
  });
  return { summary };
}

if (import.meta.main) {
  try {
    const { summary } = await run({
      fetchFn: fetch,
      statePath: "seen.json",
      send: (msg) => sendAll(msg, process.env),
      log: (line) => console.log(line),
    });
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    else console.log("\n" + summary);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
