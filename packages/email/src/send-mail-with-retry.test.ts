import { once } from "node:events";
import { createServer } from "node:net";
import * as nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  isRetryableSmtpError,
  sendMailWithRetry,
} from "./send-mail-with-retry";

function smtpError(fields: Record<string, unknown>) {
  return Object.assign(new Error("smtp failure"), fields);
}

// The shape nodemailer produced in production for a transient DNS timeout.
const dnsTimeout = () =>
  smtpError({ code: "EDNS", originalCode: "EAI_AGAIN", command: "CONN" });

describe("isRetryableSmtpError", () => {
  it.each([
    ["a transient DNS failure", dnsTimeout()],
    [
      "a refused connection",
      smtpError({ code: "ECONNECTION", command: "CONN" }),
    ],
    ["a connection timeout", smtpError({ code: "ETIMEDOUT", command: "CONN" })],
    [
      "a dropped socket while connecting",
      smtpError({ code: "ESOCKET", command: "CONN" }),
    ],
  ])("retries %s", (_label, error) => {
    expect(isRetryableSmtpError(error)).toBe(true);
  });

  it.each([
    [
      "an unknown host",
      smtpError({ code: "EDNS", originalCode: "ENOTFOUND", command: "CONN" }),
    ],
    [
      "a host without records",
      smtpError({ code: "EDNS", originalCode: "ENODATA", command: "CONN" }),
    ],
    [
      "a failure after the message was sent",
      smtpError({ code: "ETIMEDOUT", command: "DATA" }),
    ],
    [
      "an SMTP response while connecting",
      smtpError({ code: "ECONNECTION", command: "CONN", responseCode: 421 }),
    ],
    [
      "a rejected login",
      smtpError({ code: "EAUTH", command: "AUTH PLAIN", responseCode: 535 }),
    ],
    [
      "a rejected recipient",
      smtpError({ code: "EENVELOPE", command: "RCPT TO", responseCode: 550 }),
    ],
    ["a plain error", new Error("boom")],
    ["a non-error", "boom"],
  ])("does not retry %s", (_label, error) => {
    expect(isRetryableSmtpError(error)).toBe(false);
  });
});

describe("sendMailWithRetry", () => {
  const noWait = { sleep: vi.fn(async () => {}) };

  it("returns the first successful result without retrying", async () => {
    const send = vi.fn().mockResolvedValue("sent");
    await expect(sendMailWithRetry(send, noWait)).resolves.toBe("sent");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries a transient DNS failure and succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const send = vi
      .fn()
      .mockRejectedValueOnce(dnsTimeout())
      .mockRejectedValueOnce(dnsTimeout())
      .mockResolvedValue("sent");

    await expect(sendMailWithRetry(send, { sleep })).resolves.toBe("sent");
    expect(send).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1_000], [3_000]]);
  });

  it("gives up after three attempts with the last error", async () => {
    const last = dnsTimeout();
    const send = vi
      .fn()
      .mockRejectedValueOnce(dnsTimeout())
      .mockRejectedValueOnce(dnsTimeout())
      .mockRejectedValueOnce(last);

    await expect(sendMailWithRetry(send, noWait)).rejects.toBe(last);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("does not retry a failure the server may have acted on", async () => {
    const rejected = smtpError({
      code: "EENVELOPE",
      command: "RCPT TO",
      responseCode: 550,
    });
    const send = vi.fn().mockRejectedValue(rejected);

    await expect(sendMailWithRetry(send, noWait)).rejects.toBe(rejected);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("nodemailer connection failures", () => {
  it("reports a refused connection in the shape that is retried", async () => {
    // Bind and release a loopback port so nothing is listening on it.
    const server = createServer().listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const transport = nodemailer.createTransport({
      host: "127.0.0.1",
      port: address.port,
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 2_000,
    });
    const error = await transport
      .sendMail({ from: "a@example.com", to: "b@example.com", text: "x" })
      .catch((caught: unknown) => caught);
    transport.close();

    expect(error).toMatchObject({ command: "CONN" });
    expect(isRetryableSmtpError(error)).toBe(true);
  });
});
