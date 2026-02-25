export function handleNotificationAction(notification, navigate) {
    if (!notification) return;

    switch (notification.type) {
        case "ProjectInvite":
            if (notification.relatedEntityId) {
                navigate(`/notifications/project-invite/${notification.relatedEntityId}`);
            }
            break;

        case "WorkspaceInvite":
            if (notification.relatedEntityId) {
                navigate(`/workspace-invite/${notification.relatedEntityId}`);
            }
            break;

        case "TaskAssignment":
            if (notification.relatedEntityId && notification.relatedProjectId) {
                navigate(`/project/${notification.relatedProjectId}/tasks/${notification.relatedEntityId}`);
            }
            break;

        default:
            break;
    }
}
