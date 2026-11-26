import { describe, expect, it } from "vite-plus/test";
import { toInvitationResendRequest } from "./to-invitation-resend-request";

const base = { email: "invitee@example.com", role: "member" };

describe("toInvitationResendRequest", () => {
  it("repeats all-project access", () => {
    expect(
      toInvitationResendRequest({
        ...base,
        projectAccess: "all",
        projectIds: [],
      }),
    ).toEqual({ ...base, projectAccess: "all", projectIds: [] });
  });

  it("repeats the stored project list and role for selected access", () => {
    expect(
      toInvitationResendRequest({
        email: "invitee@example.com",
        role: "admin",
        projectAccess: "selected",
        projectIds: ["project-a", "project-b"],
      }),
    ).toEqual({
      email: "invitee@example.com",
      role: "admin",
      projectAccess: "selected",
      projectIds: ["project-a", "project-b"],
    });
  });

  it.each([
    ["missing access", {}],
    ["null access", { projectAccess: null, projectIds: null }],
    ["unknown access", { projectAccess: "everything", projectIds: [] }],
    ["selected without a project list", { projectAccess: "selected" }],
    [
      "selected with an empty project list",
      { projectAccess: "selected", projectIds: [] },
    ],
  ])("refuses instead of widening on %s", (_label, access) => {
    expect(toInvitationResendRequest({ ...base, ...access })).toBeNull();
  });
});
