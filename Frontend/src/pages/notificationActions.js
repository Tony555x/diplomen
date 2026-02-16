export function handleNotificationAction(notification, navigate) {
    if (!notification) return;
    console.log(notification);
    switch (notification.type) {
        case "ProjectInvite":
            if (notification.relatedEntityId) {
                navigate(
                    `/notifications/project-invite/${notification.relatedEntityId}`
                );
            }
            break;

        case "TaskAssignment":
            if (notification.relatedEntityId) {
                navigate(`/tasks/${notification.relatedEntityId}`);
            }
            break;

        default:
            break;
    }
}
