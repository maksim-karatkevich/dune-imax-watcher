import { test } from "node:test";
import assert from "node:assert/strict";
import type { ApiCinema, ApiEvent, Showing } from "../src/types.ts";
import { findNew, formatAlert, formatLive, renderSummary, selectMatching } from "../src/logic.ts";

const cinemas: ApiCinema[] = [{ id: "1064", displayName: "Kraków - Zakopianka" }];

function ev(id: string, dateTime: string, attributeIds: string[], free = 0.5): ApiEvent {
  return {
    id,
    eventDateTime: dateTime,
    attributeIds,
    soldOut: false,
    availabilityRatio: free,
    bookingLink: `https://tickets.cinema-city.pl/api/order/${id}?lang=en`,
    cinemaId: "1064",
  };
}

function showing(id: string, dateTime: string, free = 0.5): Showing {
  return {
    id,
    dateTime,
    cinema: "Kraków - Zakopianka",
    free,
    soldOut: false,
    bookingLink: `https://tickets.cinema-city.pl/api/order/${id}?lang=en`,
  };
}

test("selectMatching keeps only IMAX + subtitled showings", () => {
  const result = selectMatching(
    [
      ev("a", "2026-12-16T19:45:00", ["2d", "imax", "subbed"]),
      ev("b", "2026-12-16T10:00:00", ["2d", "imax", "dubbed"]),
      ev("c", "2026-12-16T13:00:00", ["2d", "subbed"]),
    ],
    cinemas,
  );
  assert.deepEqual(result.map((s) => s.id), ["a"]);
});

test("selectMatching maps fields and cinema name", () => {
  const [s] = selectMatching([ev("a", "2026-12-16T19:45:00", ["imax", "subbed"], 0.2342)], cinemas);
  assert.equal(s.free, 0.2342);
  assert.equal(s.cinema, "Kraków - Zakopianka");
  assert.equal(s.dateTime, "2026-12-16T19:45:00");
  assert.equal(s.bookingLink, "https://tickets.cinema-city.pl/api/order/a?lang=en");
});

test("selectMatching falls back to cinema id when the cinema is unknown", () => {
  const e = { ...ev("a", "2026-12-16T19:45:00", ["imax", "subbed"]), cinemaId: "9999" };
  assert.equal(selectMatching([e], cinemas)[0].cinema, "9999");
});

test("selectMatching sorts by date-time", () => {
  const result = selectMatching(
    [
      ev("late", "2026-12-17T19:45:00", ["imax", "subbed"]),
      ev("early", "2026-12-16T13:15:00", ["imax", "subbed"]),
    ],
    cinemas,
  );
  assert.deepEqual(result.map((s) => s.id), ["early", "late"]);
});

test("selectMatching handles no events", () => {
  assert.deepEqual(selectMatching([], []), []);
});

test("findNew returns only unseen ids", () => {
  const all = [showing("a", "2026-12-16T19:45:00"), showing("b", "2026-12-21T19:45:00")];
  assert.deepEqual(findNew(all, new Set(["a"])).map((s) => s.id), ["b"]);
});

test("findNew does not re-alert a showing that vanished and came back", () => {
  // "a" was seen in an earlier run, missing in some runs since, and is back now.
  assert.deepEqual(findNew([showing("a", "2026-12-16T19:45:00")], new Set(["a"])), []);
});

test("formatAlert lists each new showing with free % and booking link", () => {
  const msg = formatAlert([
    showing("a", "2026-12-16T19:45:00", 0.2342),
    showing("b", "2026-12-21T13:15:00", 0.98),
  ]);
  assert.match(msg.title, /2 new/);
  assert.match(msg.title, /IMAX/);
  assert.match(msg.body, /Wed 16 Dec 19:45/);
  assert.match(msg.body, /Mon 21 Dec 13:15/);
  assert.match(msg.body, /23% free/);
  assert.match(msg.body, /98% free/);
  assert.ok(msg.body.includes("https://tickets.cinema-city.pl/api/order/a?lang=en"));
  assert.ok(msg.body.includes("https://tickets.cinema-city.pl/api/order/b?lang=en"));
});

test("formatLive reports how many showings are known and the latest date", () => {
  const all = Array.from({ length: 21 }, (_, i) =>
    showing(String(i), i === 20 ? "2026-12-20T23:00:00" : "2026-12-16T19:45:00"),
  );
  const msg = formatLive(all);
  assert.match(msg.title, /live/i);
  assert.match(msg.body, /21/);
  assert.match(msg.body, /20 Dec/);
});

test("renderSummary shows counts, a row per showing and marks new ones", () => {
  const md = renderSummary({
    checkedAt: new Date("2026-11-26T14:30:00Z"),
    dates: ["2026-12-16", "2026-12-21"],
    all: [showing("a", "2026-12-16T19:45:00", 0.23), showing("b", "2026-12-21T19:45:00", 0.99)],
    newIds: new Set(["b"]),
  });
  assert.match(md, /1 new/);
  assert.match(md, /\| Wed 16 Dec 19:45 \|.*23%/);
  assert.match(md, /🆕.*Mon 21 Dec 19:45|Mon 21 Dec 19:45.*🆕/);
  assert.doesNotMatch(md, /🆕.*Wed 16 Dec|Wed 16 Dec.*🆕/);
});

test("renderSummary says 0 new when nothing is new", () => {
  const md = renderSummary({
    checkedAt: new Date(),
    dates: ["2026-12-16"],
    all: [showing("a", "2026-12-16T19:45:00")],
    newIds: new Set(),
  });
  assert.match(md, /0 new/);
});

test("renderSummary handles no dates on sale", () => {
  const md = renderSummary({ checkedAt: new Date(), dates: [], all: [], newIds: new Set() });
  assert.match(md, /No dates on sale/);
});
