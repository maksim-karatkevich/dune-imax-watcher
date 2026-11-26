/** One showing as returned by Cinema City's `cinema-events` endpoint (only the fields we use). */
export type ApiEvent = {
  id: string;
  /** Local Warsaw time without a zone, e.g. "2026-12-16T19:45:00". */
  eventDateTime: string;
  attributeIds: string[];
  soldOut: boolean;
  /** Share of seats still free, 0..1. */
  availabilityRatio: number;
  bookingLink: string;
  cinemaId: string;
};

export type ApiCinema = { id: string; displayName: string };

/** A showing we care about (IMAX + English with Polish subtitles). */
export type Showing = {
  id: string;
  dateTime: string;
  cinema: string;
  free: number;
  soldOut: boolean;
  bookingLink: string;
};

export type Message = { title: string; body: string };
