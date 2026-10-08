import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveAuthSecret } from "../utils/auth-secret";

export type SignedInvitationPayload = {
  invitationId: string;
  workspaceId: string;
  email: string;
  inviterId: string;
  exp: number;
};

function base64UrlEncode(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): Buffer {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function invitationTokenSecret(): string {
  const fromEnv = process.env.INVITATION_TOKEN_SECRET?.trim();
  if (fromEnv) return fromEnv;
  return resolveAuthSecret();
}

function signPayload(payloadJson: string): Buffer {
  return createHmac("sha256", invitationTokenSecret())
    .update(payloadJson)
    .digest();
}

export function isSignedInvitationLinksEnabled(): boolean {
  return process.env.PRSM_SIGNED_INVITATION_LINKS !== "false";
}

export function isRequireEmailVerificationOnInvitation(): boolean {
  return process.env.PRSM_REQUIRE_EMAIL_VERIFICATION_ON_INVITATION === "true";
}

export function signInvitationToken(payload: SignedInvitationPayload): string {
  const payloadJson = JSON.stringify(payload);
  const payloadPart = base64UrlEncode(payloadJson);
  const sigPart = base64UrlEncode(signPayload(payloadJson));
  return `${payloadPart}.${sigPart}`;
}

export function verifyInvitationToken(
  token: string,
): SignedInvitationPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  let payloadJson: string;
  try {
    payloadJson = base64UrlDecode(parts[0]).toString("utf8");
  } catch {
    return null;
  }
  const expectedSig = signPayload(payloadJson);
  let actualSig: Buffer;
  try {
    actualSig = base64UrlDecode(parts[1]);
  } catch {
    return null;
  }
  if (
    expectedSig.length !== actualSig.length ||
    !timingSafeEqual(expectedSig, actualSig)
  ) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (
    typeof p.invitationId !== "string" ||
    typeof p.workspaceId !== "string" ||
    typeof p.email !== "string" ||
    typeof p.inviterId !== "string" ||
    typeof p.exp !== "number"
  ) {
    return null;
  }
  if (p.exp * 1000 < Date.now()) {
    return null;
  }
  return {
    invitationId: p.invitationId,
    workspaceId: p.workspaceId,
    email: p.email.toLowerCase(),
    inviterId: p.inviterId,
    exp: p.exp,
  };
}

export function buildSignedInvitationAcceptPath(
  payload: SignedInvitationPayload,
): string {
  return `/invitation/accept/${signInvitationToken(payload)}`;
}

export function looksLikeSignedInvitationToken(value: string): boolean {
  return value.includes(".") && value.length > 40;
}
