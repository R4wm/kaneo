import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  signInvitationToken,
  verifyInvitationToken,
  type SignedInvitationPayload,
} from "./signed-invitation-token";

const basePayload = (): SignedInvitationPayload => ({
  invitationId: "inv123456789",
  workspaceId: "ws123456789",
  email: "invitee@example.com",
  inviterId: "user123456789",
  exp: Math.floor(Date.now() / 1000) + 3600,
});

describe("signed-invitation-token", () => {
  afterEach(() => {
    delete process.env.INVITATION_TOKEN_SECRET;
    delete process.env.AUTH_SECRET;
  });

  it("round-trips a valid token", () => {
    process.env.INVITATION_TOKEN_SECRET =
      "test-secret-at-least-32-characters-long";
    const token = signInvitationToken(basePayload());
    const verified = verifyInvitationToken(token);
    expect(verified?.invitationId).toBe("inv123456789");
    expect(verified?.email).toBe("invitee@example.com");
  });

  it("rejects tampered payload", () => {
    process.env.INVITATION_TOKEN_SECRET =
      "test-secret-at-least-32-characters-long";
    const token = signInvitationToken(basePayload());
    const [payload, sig] = token.split(".");
    const tampered = `${payload}x.${sig}`;
    expect(verifyInvitationToken(tampered)).toBeNull();
  });

  it("rejects expired token", () => {
    process.env.INVITATION_TOKEN_SECRET =
      "test-secret-at-least-32-characters-long";
    const token = signInvitationToken({
      ...basePayload(),
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(verifyInvitationToken(token)).toBeNull();
  });
});
