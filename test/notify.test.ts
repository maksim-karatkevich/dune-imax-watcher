import { test } from "node:test";
import assert from "node:assert/strict";
import { sendEmail } from "../src/notify.ts";

const env = { RESEND_API_KEY: "re_test", ALERT_EMAIL: "someone@example.com" };

test("a Resend error does not leak email addresses into the (public) run log", async () => {
  const fakeFetch = (async () =>
    new Response(
      JSON.stringify({
        name: "validation_error",
        message: "You can only send testing emails to your own email address (owner@example.com).",
      }),
      { status: 403 },
    )) as typeof fetch;

  await assert.rejects(sendEmail({ title: "t", body: "b" }, env, fakeFetch), (err: Error) => {
    assert.match(err.message, /403/);
    assert.match(err.message, /validation_error/);
    assert.doesNotMatch(err.message, /@/);
    return true;
  });
});
