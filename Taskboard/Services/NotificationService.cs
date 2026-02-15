using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Taskboard.Data.Models;

namespace Taskboard.Services
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string userId, NotificationType type, string title, string message, int? relatedEntityId);
        Task SendProjectInviteAsync(Project project, User inviter, List<User> invitees);
        Task SendTaskAssignmentAsync(TaskItem task, User assigner, User assignee);
    }

    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;

        public NotificationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task SendNotificationAsync(string userId, NotificationType type, string title, string message, int? relatedEntityId)
        {
            var notification = new Notification
            {
                UserId = userId,
                Type = type,
                Title = title,
                Message = message,
                RelatedEntityId = relatedEntityId,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }

        public async Task SendProjectInviteAsync(Project project, User inviter, List<User> invitees)
        {
            foreach (var user in invitees)
            {
                if (user.Id == inviter.Id) continue; // Don't notify self

                await SendNotificationAsync(
                    user.Id,
                    NotificationType.ProjectInvite,
                    "Project Invitation",
                    $"You have been invited to project '{project.Name}' by {inviter.UserName ?? "a member"}.",
                    project.Id
                );
            }
        }

        public async Task SendTaskAssignmentAsync(TaskItem task, User assigner, User assignee)
        {
             if (assignee.Id == assigner.Id) return; // Don't notify if assigning self

             await SendNotificationAsync(
                assignee.Id,
                NotificationType.TaskAssignment,
                "Task Assignment",
                $"You have been assigned to task '{task.Title}' by {assigner.UserName ?? "a member"}.",
                task.Id
            );
        }
    }
}
