import type { ApiCinema, ApiEvent, Message, Showing } from "./types.ts";

const REQUIRED_ATTRIBUTES = ["imax", "subbed"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function selectMatching(events: ApiEvent[], cinemas: ApiCinema[]): Showing[] {
  const cinemaNames = new Map(cinemas.map((c) => [c.id, c.displayName]));
  return events
    .filter((e) => REQUIRED_ATTRIBUTES.every((a) => e.attributeIds.includes(a)))
    .map((e) => ({
      id: e.id,
      dateTime: e.eventDateTime,
      cinema: cinemaNames.get(e.cinemaId) ?? e.cinemaId,
      free: e.availabilityRatio,
      soldOut: e.soldOut,
      bookingLink: e.bookingLink,
    }))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

export function findNew(showings: Showing[], seen: Set<string>): Showing[] {
  return showings.filter((s) => !seen.has(s.id));
}

/**
 * "2026-12-16T19:45:00" → "Wed 16 Dec 19:45".
 * Parsed by hand: the string is already Warsaw local time, and going through
 * Date with a time zone would shift it on CI machines running in UTC.
 */
export function formatDateTime(dateTime: string): string {
  const [date, time = ""] = dateTime.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]} ${time.slice(0, 5)}`.trim();
}

function percent(free: number): string {
  return `${Math.round(free * 100)}%`;
}

export function formatAlert(newOnes: Showing[]): Message {
  const n = newOnes.length;
  const lines = newOnes.map(
    (s) => `• ${formatDateTime(s.dateTime)} — ${s.cinema} — ${percent(s.free)} free\n  ${s.bookingLink}`,
  );
  return {
    title: `Dune IMAX: ${n} new showing${n === 1 ? "" : "s"} (EN + PL subs)`,
    body: `New IMAX showings of Dune: Part Three are on sale:\n\n${lines.join("\n\n")}\n\nBook 4 seats fast!`,
  };
}

export function formatLive(all: Showing[]): Message {
  const latest = all.at(-1);
  const latestText = latest ? ` Latest showing: ${formatDateTime(latest.dateTime)}.` : "";
  return {
    title: "Dune IMAX watcher is live",
    body:
      `Watching for new IMAX showings of Dune: Part Three (EN + PL subs).\n\n` +
      `Currently known: ${all.length} showings.${latestText}\n\n` +
      `You'll get a message only when new showings appear.`,
  };
}

export function renderSummary(input: {
  checkedAt: Date;
  dates: string[];
  all: Showing[];
  newIds: Set<string>;
}): string {
  const { checkedAt, dates, all, newIds } = input;
  const checked = checkedAt.toLocaleString("en-GB", {
    timeZone: "Europe/Warsaw",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const out = [`## Dune Part 3 — IMAX, EN + PL subs — checked ${checked} (Warsaw)`, ""];
  out.push(
    dates.length === 0
      ? "No dates on sale."
      : `Dates on sale: ${dates[0]} → ${dates.at(-1)} (${dates.length})`,
  );
  out.push(`Matching showings: ${all.length} known, ${newIds.size} new`, "");
  if (all.length > 0) {
    out.push("| Showing | Cinema | Free | Sold out | |", "|---|---|---|---|---|");
    for (const s of all) {
      const mark = newIds.has(s.id) ? "🆕" : "";
      out.push(`| ${formatDateTime(s.dateTime)} | ${s.cinema} | ${percent(s.free)} | ${s.soldOut ? "yes" : "no"} | ${mark} |`);
    }
  }
  return out.join("\n") + "\n";
}
