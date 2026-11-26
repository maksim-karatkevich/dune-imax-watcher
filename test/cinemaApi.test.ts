import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchDates, fetchEvents } from "../src/cinemaApi.ts";

/** A stand-in for fetch that records the URL and answers with a fixed body. */
function fakeFetch(body: string, status = 200) {
  const calls: string[] = [];
  const fn = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(body, { status });
  }) as typeof fetch;
  return { fn, calls };
}

test("fetchDates returns the dates and calls the dates endpoint", async () => {
  const { fn, calls } = fakeFetch(JSON.stringify({ body: { dates: ["2026-12-15"] } }));
  assert.deepEqual(await fetchDates(fn), ["2026-12-15"]);
  assert.match(calls[0], /\/dates\/in-group\/krakow\/with-film\/8105s2r\/until\/\d{4}-\d{2}-\d{2}/);
});

test("fetchDates returns [] when nothing is on sale", async () => {
  const { fn } = fakeFetch(JSON.stringify({ body: { dates: [] } }));
  assert.deepEqual(await fetchDates(fn), []);
});

test("fetchEvents calls the events endpoint for the date and returns events and cinemas", async () => {
  const payload = {
    body: {
      cinemas: [{ id: "1064", displayName: "Kraków - Zakopianka" }],
      events: [{ id: "1", eventDateTime: "2026-12-19T19:45:00", attributeIds: ["imax"], soldOut: false, availabilityRatio: 0.2, bookingLink: "x", cinemaId: "1064" }],
    },
  };
  const { fn, calls } = fakeFetch(JSON.stringify(payload));
  const result = await fetchEvents("2026-12-19", fn);
  assert.match(calls[0], /\/cinema-events\/in-group\/krakow\/with-film\/8105s2r\/at-date\/2026-12-19/);
  assert.equal(result.events.length, 1);
  assert.equal(result.cinemas[0].displayName, "Kraków - Zakopianka");
});

test("rejects with the status on an HTTP error", async () => {
  const { fn } = fakeFetch("Forbidden", 403);
  await assert.rejects(fetchDates(fn), /403/);
});

test("rejects on an HTML page instead of JSON (e.g. Cloudflare challenge)", async () => {
  const { fn } = fakeFetch("<html>Just a moment...</html>");
  await assert.rejects(fetchDates(fn), /unexpected/i);
});

test("rejects on JSON without body.dates", async () => {
  const { fn } = fakeFetch(JSON.stringify({ body: {} }));
  await assert.rejects(fetchDates(fn), /unexpected/i);
});

test("rejects on events JSON without body.events", async () => {
  const { fn } = fakeFetch(JSON.stringify({ body: { cinemas: [] } }));
  await assert.rejects(fetchEvents("2026-12-19", fn), /unexpected/i);
});
