import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { track } from "@/lib/analytics/track";
import { authClient } from "@/lib/auth-client";
import queryClient from "@/query-client";

type InviteWorkspaceUserRequest = {
  workspaceId: string;
  email: string;
  role: string;
  resend?: boolean;
  projectAccess?: "all" | "selected";
  projectIds?: string[];
};

function useInviteWorkspaceUser() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      email,
      role,
      resend,
      projectAccess,
      projectIds,
    }: InviteWorkspaceUserRequest) => {
      const { data, error } = await authClient.organization.inviteMember({
        email,
        role,
        organizationId: workspaceId,
        resend,
        ...(projectAccess ? { projectAccess, projectIds } : {}),
      });

      if (error?.code === "INVITATION_EMAIL_FAILED") {
        throw new Error(t("settings:invitationEmailFailed"));
      }
      if (error?.code === "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION") {
        throw new Error(t("settings:invitationAlreadyPending"));
      }
      if (error?.code === "INVITATION_RESEND_MISMATCH") {
        throw new Error(t("settings:invitationResendMismatch"));
      }
      // A proxy in front of the API (e.g. a CDN) can replace a 5xx body, so
      // the code is gone. The invitation may have been saved.
      if (error && !error.code && (error.status ?? 0) >= 500) {
        throw new Error(t("settings:invitationServerError"));
      }
      if (error) {
        throw new Error(error.message || "Failed to invite workspace member");
      }

      return data;
    },
    onSuccess: (_data, { resend }) => {
      if (!resend) track("Invite Sent");
    },
    onSettled: (_, _error, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-invites", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["workspace", "full", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["workspace-users", workspaceId],
      });
    },
  });
}

export default useInviteWorkspaceUser;
