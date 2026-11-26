import { describe, expect, it } from "vite-plus/test";
import { invitationResendMatches } from "./invitation-resend-matches";

const member = { role: "member", projectAccess: "all", projectIds: [] };
const scoped = {
  role: "member",
  projectAccess: "selected",
  projectIds: ["a", "b"],
};

describe("invitationResendMatches", () => {
  it("matches the same role and all-project access", () => {
    expect(
      invitationResendMatches(member, {
        role: "member",
        projectAccess: "all",
        projectIds: [],
      }),
    ).toBe(true);
  });

  it("rejects a different role", () => {
    expect(invitationResendMatches(member, { role: "admin" })).toBe(false);
  });

  it("compares role lists without order or duplicates", () => {
    const stored = { ...member, role: "member,billing" };
    expect(invitationResendMatches(stored, { role: "billing, member" })).toBe(
      true,
    );
    expect(
      invitationResendMatches(stored, { role: ["billing", "member"] }),
    ).toBe(true);
    expect(invitationResendMatches(stored, { role: "member" })).toBe(false);
  });

  it("rejects selected access against stored all-project access", () => {
    expect(
      invitationResendMatches(member, {
        role: "member",
        projectAccess: "selected",
        projectIds: ["a"],
      }),
    ).toBe(false);
  });

  it("rejects all-project access against stored selected access", () => {
    expect(
      invitationResendMatches(scoped, { role: "member", projectAccess: "all" }),
    ).toBe(false);
  });

  it("matches selected projects regardless of order", () => {
    expect(
      invitationResendMatches(scoped, {
        role: "member",
        projectAccess: "selected",
        projectIds: ["b", "a"],
      }),
    ).toBe(true);
  });

  it.each([
    ["a narrower list", ["a"]],
    ["a wider list", ["a", "b", "c"]],
    ["a missing list", undefined],
    ["a non-string entry", ["a", 2]],
  ])("rejects selected access with %s", (_label, projectIds) => {
    expect(
      invitationResendMatches(scoped, {
        role: "member",
        projectAccess: "selected",
        projectIds,
      }),
    ).toBe(false);
  });

  it("does not compare access the caller left out", () => {
    expect(invitationResendMatches(scoped, { role: "member" })).toBe(true);
  });
});
