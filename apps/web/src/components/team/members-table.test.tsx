import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import type {
  WorkspaceUser,
  WorkspaceUserInvitation,
} from "@/types/workspace-user";
import MembersTable from "./members-table";

const copyToClipboard = vi.fn();
const success = vi.fn();
const error = vi.fn();

vi.mock("@/lib/copy-to-clipboard", () => ({
  copyToClipboard: (text: string) => copyToClipboard(text),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: (msg: string) => success(msg),
    error: (msg: string) => error(msg),
  },
}));

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/format", () => ({
  formatDateMedium: () => "Sep 1, 2026",
}));

vi.mock("@/hooks/mutations/workspace-user/use-cancel-invitation", () => ({
  default: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const resendInvitation = vi.fn();

vi.mock("@/hooks/mutations/workspace-user/use-invite-workspace-user", () => ({
  default: () => ({ mutateAsync: resendInvitation, isPending: false }),
}));

vi.mock("@/hooks/mutations/workspace-user/use-delete-workspace-user", () => ({
  default: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock(
  "@/hooks/mutations/workspace-user/use-update-workspace-user-role",
  () => ({
    default: () => ({ mutateAsync: vi.fn() }),
  }),
);

vi.mock("@/hooks/queries/workspace/use-workspace-roles", () => ({
  default: () => ({ data: [] }),
}));

const updateProjectAccess = vi.fn();

vi.mock(
  "@/hooks/mutations/workspace-user/use-update-member-project-access",
  () => ({
    default: () => ({ mutateAsync: updateProjectAccess, isPending: false }),
  }),
);

vi.mock(
  "@/hooks/queries/workspace-users/use-get-workspace-project-access",
  () => ({
    default: () => ({
      data: [
        {
          userId: "restricted-user",
          projectAccess: "selected",
          projectIds: ["project-a"],
        },
      ],
    }),
  }),
);

const myProjectAccess = vi.fn(() => ({
  projectAccess: "all",
  projectIds: [] as string[],
}));

vi.mock("@/hooks/queries/workspace-users/use-get-my-project-access", () => ({
  default: () => ({ data: myProjectAccess() }),
}));

vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({
    data: [
      { id: "project-a", name: "Alpha" },
      { id: "project-b", name: "Beta" },
    ],
    isLoading: false,
  }),
}));

const canInviteUsers = vi.fn(() => true);

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canManageTeam: () => true,
    canUpdateMembers: () => true,
    canRemoveMembers: () => true,
    canInviteUsers: () => canInviteUsers(),
  }),
}));

vi.mock("../providers/auth-provider/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "current-user" } }),
}));

beforeEach(() => {
  canInviteUsers.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pendingInvitation = {
  id: "invite-1",
  email: "invitee@example.com",
  role: "member",
  status: "pending",
  expiresAt: "2026-09-01T00:00:00.000Z",
  projectAccess: "all",
  projectIds: [],
} as unknown as WorkspaceUserInvitation;

describe("MembersTable pending invitation row menu", () => {
  it("copies the invitation link for that invitation when 'Copy link' is clicked", async () => {
    copyToClipboard.mockResolvedValue(true);

    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[pendingInvitation]}
        users={[] as WorkspaceUser[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "team:membersTable.ariaInvitationActions",
      }),
    );

    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "team:invitations.copyLink",
      }),
    );

    expect(copyToClipboard).toHaveBeenCalledWith(
      `${window.location.origin}/invitation/accept/invite-1`,
    );
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("team:invitations.linkCopied"),
    );
  });

  it("still opens the cancel confirmation dialog instead of cancelling directly", async () => {
    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[pendingInvitation]}
        users={[] as WorkspaceUser[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "team:membersTable.ariaInvitationActions",
      }),
    );

    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "team:membersTable.cancelInvitation",
      }),
    );

    expect(
      await screen.findByText("team:membersTable.cancelDialogTitle"),
    ).toBeVisible();
    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it("hides the row menu entirely when the user lacks canInvite", () => {
    canInviteUsers.mockReturnValue(false);

    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[pendingInvitation]}
        users={[] as WorkspaceUser[]}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "team:membersTable.ariaInvitationActions",
      }),
    ).toBeNull();
  });
});

describe("MembersTable resend invitation", () => {
  const openResend = async (invitation: WorkspaceUserInvitation) => {
    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[invitation]}
        users={[] as WorkspaceUser[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "team:membersTable.ariaInvitationActions",
      }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "team:membersTable.resendInvitation",
      }),
    );
  };

  it("resends with the invitation's stored role and selected projects", async () => {
    resendInvitation.mockResolvedValue({ id: "invite-2" });

    await openResend({
      ...pendingInvitation,
      role: "admin",
      projectAccess: "selected",
      projectIds: ["project-a"],
    } as unknown as WorkspaceUserInvitation);

    await waitFor(() =>
      expect(resendInvitation).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        email: "invitee@example.com",
        role: "admin",
        projectAccess: "selected",
        projectIds: ["project-a"],
        resend: true,
      }),
    );
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        "team:membersTable.resendInviteSuccess",
      ),
    );
  });

  it("resends all-project invitations as all-project invitations", async () => {
    resendInvitation.mockResolvedValue({ id: "invite-1" });

    await openResend(pendingInvitation);

    await waitFor(() =>
      expect(resendInvitation).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        email: "invitee@example.com",
        role: "member",
        projectAccess: "all",
        projectIds: [],
        resend: true,
      }),
    );
  });

  it("refuses to resend when the stored project access is missing", async () => {
    const {
      projectAccess: _a,
      projectIds: _i,
      ...withoutAccess
    } = pendingInvitation as unknown as Record<string, unknown>;

    await openResend(withoutAccess as unknown as WorkspaceUserInvitation);

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        "team:membersTable.resendInviteUnavailable",
      ),
    );
    expect(resendInvitation).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it("shows the server error and no success toast when resending fails", async () => {
    resendInvitation.mockRejectedValue(
      new Error("The invitation email could not be sent."),
    );

    await openResend(pendingInvitation);

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        "The invitation email could not be sent.",
      ),
    );
    expect(success).not.toHaveBeenCalled();
  });
});

function makeMember(userId: string, role: string, name: string) {
  return {
    id: `member-${userId}`,
    userId,
    role,
    createdAt: "2026-09-01T00:00:00.000Z",
    user: { id: userId, name, email: `${userId}@example.com`, image: null },
  } as unknown as WorkspaceUser;
}

describe("MembersTable project access", () => {
  const members = [
    makeMember("owner-user", "owner", "Olive Owner"),
    makeMember("current-user", "admin", "Casey Current"),
    makeMember("restricted-user", "member", "Riley Restricted"),
    makeMember("open-user", "member", "Avery All"),
  ];

  it("lets managers edit other members' access but not owners or themselves", () => {
    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[]}
        users={members}
      />,
    );

    const editButtons = screen.getAllByRole("button", {
      name: "team:projectAccess.editAria",
    });
    expect(editButtons).toHaveLength(2);
    expect(
      screen.getAllByText("team:projectAccess.projectCount").length,
    ).toBeGreaterThan(0);
  });

  it("lets a limited manager edit only limited members", () => {
    myProjectAccess.mockReturnValue({
      projectAccess: "selected",
      projectIds: ["project-a"],
    });

    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[]}
        users={members}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "team:projectAccess.editAria" }),
    ).toHaveLength(1);
    myProjectAccess.mockReturnValue({ projectAccess: "all", projectIds: [] });
  });

  it("saves selected projects for a member from the dialog", async () => {
    updateProjectAccess.mockResolvedValue({});

    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[]}
        users={[members[2]]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "team:projectAccess.editAria" }),
    );

    expect(
      await screen.findByText("team:projectAccess.dialogTitle"),
    ).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));
    fireEvent.click(
      screen.getByRole("button", { name: "team:projectAccess.save" }),
    );

    await waitFor(() =>
      expect(updateProjectAccess).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        userId: "restricted-user",
        projectAccess: "selected",
        projectIds: ["project-a", "project-b"],
      }),
    );
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("team:projectAccess.updateSuccess"),
    );
  });

  it("asks for a project instead of saving an empty selection", async () => {
    render(
      <MembersTable
        workspaceId="workspace-1"
        invitations={[]}
        users={[members[2]]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "team:projectAccess.editAria" }),
    );
    fireEvent.click(await screen.findByRole("checkbox", { name: "Alpha" }));
    fireEvent.click(
      screen.getByRole("button", { name: "team:projectAccess.save" }),
    );

    expect(
      await screen.findByText("team:projectAccess.selectAtLeastOne"),
    ).toBeVisible();
    expect(updateProjectAccess).not.toHaveBeenCalled();
  });
});
