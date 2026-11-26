import type { ApiCinema, ApiEvent } from "./types.ts";

const BASE = "https://www.cinema-city.pl/pl/data-api-service/v1/quickbook/10103";
const GROUP = "krakow";
const FILM = "8105s2r"; // Dune: Part Three

async function getJson(url: string, fetchFn: typeof fetch): Promise<unknown> {
  const res = await fetchFn(url, {
    headers: { Accept: "application/json", "User-Agent": "dune-imax-watcher" },
  });
  if (!res.ok) throw new Error(`Cinema City API returned HTTP ${res.status} for ${url}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Cinema City API returned an unexpected non-JSON response for ${url}: ${text.slice(0, 120)}`);
  }
}

function unexpected(url: string): Error {
  return new Error(`Cinema City API returned an unexpected JSON shape for ${url}`);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchDates(fetchFn: typeof fetch = fetch): Promise<string[]> {
  const until = new Date();
  until.setFullYear(until.getFullYear() + 1);
  const url = `${BASE}/dates/in-group/${GROUP}/with-film/${FILM}/until/${isoDate(until)}?attr=&lang=en_GB`;
  const json = (await getJson(url, fetchFn)) as { body?: { dates?: unknown } };
  if (!Array.isArray(json?.body?.dates)) throw unexpected(url);
  return json.body.dates as string[];
}

export async function fetchEvents(
  date: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ events: ApiEvent[]; cinemas: ApiCinema[] }> {
  const url = `${BASE}/cinema-events/in-group/${GROUP}/with-film/${FILM}/at-date/${date}?attr=&lang=en_GB`;
  const json = (await getJson(url, fetchFn)) as { body?: { events?: unknown; cinemas?: unknown } };
  if (!Array.isArray(json?.body?.events) || !Array.isArray(json.body.cinemas)) throw unexpected(url);
  return { events: json.body.events as ApiEvent[], cinemas: json.body.cinemas as ApiCinema[] };
}
