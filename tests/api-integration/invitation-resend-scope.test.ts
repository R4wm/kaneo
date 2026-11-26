import * as email from "@kaneo/email";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { resetTestDatabase } from "./helpers/database";
import { createProjectFixture } from "./helpers/fixtures";

beforeEach(async () => {
  await resetTestDatabase();
});

const origin = "http://localhost:5173";
const invitee = "invitee@example.com";

function post(path: string, body: unknown, cookie = "") {
  return createApp().app.request(`/api/auth${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

async function ownerWithWorkspace() {
  const signUp = await post("/sign-up/email", {
    name: "Owner",
    email: "owner@example.com",
    password: "original-password",
  });
  expect(signUp.status).toBe(200);
  const cookie = signUp.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const created = await post(
    "/organization/create",
    { name: "Invites", slug: "invites" },
    cookie,
  );
  expect(created.status).toBe(200);
  const workspace = (await created.json()) as { id: string };
  const { project } = await createProjectFixture({ workspaceId: workspace.id });
  return { cookie, workspaceId: workspace.id, projectId: project.id };
}

async function invitationsFor(workspaceId: string) {
  return db
    .select()
    .from(schema.invitationTable)
    .where(eq(schema.invitationTable.workspaceId, workspaceId));
}

// An expired member invitation scoped to one project, then a newer admin
// invitation with every project for the same email. Better Auth skips expired
// rows, so a resend for this email always targets the admin invitation.
async function expiredScopedAndLiveAdminInvitations() {
  const ctx = await ownerWithWorkspace();
  const scoped = {
    organizationId: ctx.workspaceId,
    email: invitee,
    role: "member",
    projectAccess: "selected",
    projectIds: [ctx.projectId],
  };
  expect(
    (await post("/organization/invite-member", scoped, ctx.cookie)).status,
  ).toBe(200);
  const [expired] = await invitationsFor(ctx.workspaceId);
  await db
    .update(schema.invitationTable)
    .set({ expiresAt: new Date(Date.now() - 60_000) })
    .where(eq(schema.invitationTable.id, expired.id));

  const admin = {
    organizationId: ctx.workspaceId,
    email: invitee,
    role: "admin",
    projectAccess: "all",
    projectIds: [],
  };
  expect(
    (await post("/organization/invite-member", admin, ctx.cookie)).status,
  ).toBe(200);
  const live = (await invitationsFor(ctx.workspaceId)).find(
    (invitation) => invitation.id !== expired.id,
  );
  if (!live) throw new Error("expected a second invitation");
  expect(live).toMatchObject({ role: "admin", projectAccess: "all" });
  return { ...ctx, scoped, admin, expiredId: expired.id, live };
}

describe("invitation resend scope", () => {
  it("refuses a resend whose scope differs from the live invitation Better Auth would resend", async () => {
    const send = vi
      .spyOn(email, "sendWorkspaceInvitationEmail")
      .mockResolvedValue({ success: true });
    const { cookie, scoped, live, workspaceId } =
      await expiredScopedAndLiveAdminInvitations();
    send.mockClear();

    const response = await post(
      "/organization/invite-member",
      { ...scoped, resend: true },
      cookie,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "INVITATION_RESEND_MISMATCH",
    });
    expect(send).not.toHaveBeenCalled();
    const after = (await invitationsFor(workspaceId)).find(
      (invitation) => invitation.id === live.id,
    );
    expect(after?.expiresAt.getTime()).toBe(live.expiresAt.getTime());
    expect(await invitationsFor(workspaceId)).toHaveLength(2);
  });

  it("refuses a resend that asks for a different role with the same access", async () => {
    vi.spyOn(email, "sendWorkspaceInvitationEmail").mockResolvedValue({
      success: true,
    });
    const { cookie, admin } = await expiredScopedAndLiveAdminInvitations();

    const response = await post(
      "/organization/invite-member",
      { ...admin, role: "member", resend: true },
      cookie,
    );

    expect(response.status).toBe(409);
  });

  it("resends the live invitation when the request matches its stored scope", async () => {
    const send = vi
      .spyOn(email, "sendWorkspaceInvitationEmail")
      .mockResolvedValue({ success: true });
    const { cookie, admin, live, workspaceId } =
      await expiredScopedAndLiveAdminInvitations();
    send.mockClear();

    const response = await post(
      "/organization/invite-member",
      { ...admin, resend: true },
      cookie,
    );

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const after = (await invitationsFor(workspaceId)).find(
      (invitation) => invitation.id === live.id,
    );
    expect(after?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      live.expiresAt.getTime(),
    );
    expect(after).toMatchObject({ role: "admin", projectAccess: "all" });
  });

  it("matches selected projects regardless of order", async () => {
    vi.spyOn(email, "sendWorkspaceInvitationEmail").mockResolvedValue({
      success: true,
    });
    const ctx = await ownerWithWorkspace();
    const { project: second } = await createProjectFixture({
      workspaceId: ctx.workspaceId,
    });
    const body = {
      organizationId: ctx.workspaceId,
      email: invitee,
      role: "member",
      projectAccess: "selected",
      projectIds: [ctx.projectId, second.id],
    };
    expect(
      (await post("/organization/invite-member", body, ctx.cookie)).status,
    ).toBe(200);

    const reordered = await post(
      "/organization/invite-member",
      { ...body, projectIds: [second.id, ctx.projectId], resend: true },
      ctx.cookie,
    );
    expect(reordered.status).toBe(200);

    const narrower = await post(
      "/organization/invite-member",
      { ...body, projectIds: [ctx.projectId], resend: true },
      ctx.cookie,
    );
    expect(narrower.status).toBe(409);
  });

  it("keeps resends that omit project access working for existing API callers", async () => {
    vi.spyOn(email, "sendWorkspaceInvitationEmail").mockResolvedValue({
      success: true,
    });
    const ctx = await ownerWithWorkspace();
    const body = {
      organizationId: ctx.workspaceId,
      email: invitee,
      role: "member",
      projectAccess: "selected",
      projectIds: [ctx.projectId],
    };
    expect(
      (await post("/organization/invite-member", body, ctx.cookie)).status,
    ).toBe(200);

    const response = await post(
      "/organization/invite-member",
      {
        organizationId: ctx.workspaceId,
        email: invitee,
        role: "member",
        resend: true,
      },
      ctx.cookie,
    );

    expect(response.status).toBe(200);
    const [invitation] = await invitationsFor(ctx.workspaceId);
    expect(invitation).toMatchObject({
      projectAccess: "selected",
      projectIds: [ctx.projectId],
    });
  });
});
