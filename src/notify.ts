import type { Message } from "./types.ts";

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (set it as a GitHub Actions secret)`);
  return value;
}

export async function sendEmail(msg: Message, env: Env, fetchFn: typeof fetch = fetch): Promise<void> {
  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required(env, "RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dune watcher <onboarding@resend.dev>",
      to: required(env, "ALERT_EMAIL"),
      subject: msg.title,
      text: msg.body,
    }),
  });
  if (!res.ok) throw new Error(`Resend returned HTTP ${res.status}: ${await res.text()}`);
}

export async function sendNtfy(msg: Message, env: Env, fetchFn: typeof fetch = fetch): Promise<void> {
  const res = await fetchFn(`https://ntfy.sh/${required(env, "NTFY_TOPIC")}`, {
    method: "POST",
    headers: {
      // HTTP headers must be ASCII; drop anything else from the title.
      Title: msg.title.replace(/[^\x20-\x7E]/g, ""),
      Priority: "high",
      Tags: "movie_camera",
    },
    body: msg.body,
  });
  if (!res.ok) throw new Error(`ntfy returned HTTP ${res.status}: ${await res.text()}`);
}

/**
 * Sends on every channel. Tries all of them even if one fails, then throws,
 * so a broken email doesn't stop the push (and the run still goes red).
 */
export async function sendAll(msg: Message, env: Env): Promise<void> {
  const results = await Promise.allSettled([sendEmail(msg, env), sendNtfy(msg, env)]);
  const errors = results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason);
  if (errors.length > 0) throw new AggregateError(errors, errors.map(String).join("; "));
}
