import { describe, expect, it } from "vite-plus/test";
import { invitationResendMatches } from "./invitation-resend-matches";

const all = { projectAccess: "all", projectIds: [] };
const scoped = { projectAccess: "selected", projectIds: ["a", "b"] };

describe("invitationResendMatches", () => {
  it("matches all-project access", () => {
    expect(
      invitationResendMatches(all, { projectAccess: "all", projectIds: [] }),
    ).toBe(true);
  });

  it("rejects selected access against stored all-project access", () => {
    expect(
      invitationResendMatches(all, {
        projectAccess: "selected",
        projectIds: ["a"],
      }),
    ).toBe(false);
  });

  it("rejects all-project access against stored selected access", () => {
    expect(invitationResendMatches(scoped, { projectAccess: "all" })).toBe(
      false,
    );
  });

  it("matches selected projects regardless of order", () => {
    expect(
      invitationResendMatches(scoped, {
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
        projectAccess: "selected",
        projectIds,
      }),
    ).toBe(false);
  });

  it("does not compare access the caller left out", () => {
    expect(invitationResendMatches(scoped, {})).toBe(true);
  });
});
