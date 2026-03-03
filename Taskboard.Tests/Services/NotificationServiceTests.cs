using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Tests.Services
{
    [TestFixture]
    public class NotificationServiceTests
    {
        private AppDbContext _context;
        private NotificationService _notificationService;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _notificationService = new NotificationService(_context);
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task SendNotificationAsync_AddsNotificationToDatabase()
        {
            // Arrange
            var userId = "user1";
            var type = NotificationType.ProjectInvite;
            var title = "Test Title";
            var message = "Test Message";
            var relatedEntityId = 1;

            // Act
            await _notificationService.SendNotificationAsync(userId, type, title, message, relatedEntityId);

            // Assert
            var notification = await _context.Notifications.FirstOrDefaultAsync();
            Assert.That(notification, Is.Not.Null);
            Assert.That(notification.UserId, Is.EqualTo(userId));
            Assert.That(notification.Type, Is.EqualTo(type));
            Assert.That(notification.Title, Is.EqualTo(title));
            Assert.That(notification.Message, Is.EqualTo(message));
            Assert.That(notification.RelatedEntityId, Is.EqualTo(relatedEntityId));
            Assert.That(notification.IsRead, Is.False);
        }

        [Test]
        public async Task SendProjectInviteAsync_SendsToInvitees_ExcludingInviter()
        {
            // Arrange
            var project = new Project { Id = 1, Name = "Test Project" };
            var inviter = new User { Id = "inviter1", UserName = "Inviter" };
            var invitee1 = new User { Id = "invitee1", UserName = "Invitee 1" };
            var invitee2 = new User { Id = "invitee2", UserName = "Invitee 2" };
            
            var invitees = new List<User> { inviter, invitee1, invitee2 }; // Includes inviter to test exclusion

            // Act
            await _notificationService.SendProjectInviteAsync(project, inviter, invitees);

            // Assert
            var notifications = await _context.Notifications.ToListAsync();
            Assert.That(notifications.Count, Is.EqualTo(2));
            Assert.That(notifications.Any(n => n.UserId == "inviter1"), Is.False);
            Assert.That(notifications.Any(n => n.UserId == "invitee1"), Is.True);
            Assert.That(notifications.Any(n => n.UserId == "invitee2"), Is.True);
            Assert.That(notifications.All(n => n.Type == NotificationType.ProjectInvite), Is.True);
        }

        [Test]
        public async Task SendTaskAssignmentAsync_SendsNotification_WhenAssigneeNotAssigner()
        {
            // Arrange
            var task = new TaskItem { Id = 1, Title = "Test Task" };
            var assigner = new User { Id = "user1", UserName = "Assigner" };
            var assignee = new User { Id = "user2", UserName = "Assignee" };

            // Act
            await _notificationService.SendTaskAssignmentAsync(task, assigner, assignee);

            // Assert
            var notification = await _context.Notifications.FirstOrDefaultAsync();
            Assert.That(notification, Is.Not.Null);
            Assert.That(notification.UserId, Is.EqualTo("user2"));
            Assert.That(notification.Type, Is.EqualTo(NotificationType.TaskAssignment));
            Assert.That(notification.RelatedEntityId, Is.EqualTo(task.Id));
        }

        [Test]
        public async Task SendTaskAssignmentAsync_DoesNotSendNotification_WhenAssigneeIsAssigner()
        {
            // Arrange
            var task = new TaskItem { Id = 1, Title = "Test Task" };
            var user = new User { Id = "user1", UserName = "User" };

            // Act
            await _notificationService.SendTaskAssignmentAsync(task, user, user);

            // Assert
            var notificationsCount = await _context.Notifications.CountAsync();
            Assert.That(notificationsCount, Is.EqualTo(0));
        }

        [Test]
        public async Task SendWorkspaceInviteAsync_SendsNotification_WhenInviteeNotInviter()
        {
            // Arrange
            var workspace = new Workspace { Id = 1, Name = "Test Workspace" };
            var inviter = new User { Id = "user1", UserName = "Inviter" };
            var invitee = new User { Id = "user2", UserName = "Invitee" };

            // Act
            await _notificationService.SendWorkspaceInviteAsync(workspace, inviter, invitee);

            // Assert
            var notification = await _context.Notifications.FirstOrDefaultAsync();
            Assert.That(notification, Is.Not.Null);
            Assert.That(notification.UserId, Is.EqualTo("user2"));
            Assert.That(notification.Type, Is.EqualTo(NotificationType.WorkspaceInvite));
            Assert.That(notification.RelatedEntityId, Is.EqualTo(workspace.Id));
        }
        
        [Test]
        public async Task SendWorkspaceInviteAsync_DoesNotSendNotification_WhenInviteeIsInviter()
        {
            // Arrange
            var workspace = new Workspace { Id = 1, Name = "Test Workspace" };
            var user = new User { Id = "user1", UserName = "User" };

            // Act
            await _notificationService.SendWorkspaceInviteAsync(workspace, user, user);

            // Assert
            var notificationsCount = await _context.Notifications.CountAsync();
            Assert.That(notificationsCount, Is.EqualTo(0));
        }
    }
}
