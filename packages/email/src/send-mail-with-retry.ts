const CONNECTION_ERROR_CODES = new Set([
  "ECONNECTION",
  "EDNS",
  "ESOCKET",
  "ETIMEDOUT",
]);
// A name that does not exist will not start existing on a retry.
const PERMANENT_DNS_CODES = new Set(["ENOTFOUND", "ENODATA"]);

const DEFAULT_DELAYS_MS = [1_000, 3_000];

function field(error: unknown, key: string): unknown {
  return error && typeof error === "object" && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

// Retry only failures that happen while connecting: nodemailer reports those
// with command "CONN" and no SMTP response, so the server never received the
// message and a retry cannot deliver it twice.
export function isRetryableSmtpError(error: unknown): boolean {
  const code = field(error, "code");
  if (typeof code !== "string" || !CONNECTION_ERROR_CODES.has(code)) {
    return false;
  }
  if (field(error, "command") !== "CONN") return false;
  if (field(error, "responseCode") !== undefined) return false;
  const originalCode = field(error, "originalCode");
  return !(
    code === "EDNS" &&
    typeof originalCode === "string" &&
    PERMANENT_DNS_CODES.has(originalCode)
  );
}

export async function sendMailWithRetry<T>(
  send: () => Promise<T>,
  {
    delaysMs = DEFAULT_DELAYS_MS,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  }: {
    delaysMs?: readonly number[];
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      const delay = delaysMs[attempt];
      if (delay === undefined || !isRetryableSmtpError(error)) throw error;
      await sleep(delay);
    }
  }
}
