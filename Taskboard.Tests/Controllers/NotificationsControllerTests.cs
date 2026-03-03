using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Controllers;
using Taskboard.Data;
using Taskboard.Data.Models;

namespace Taskboard.Tests.Controllers
{
    [TestFixture]
    public class NotificationsControllerTests
    {
        private AppDbContext _context;
        private NotificationsController _notificationsController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _notificationsController = new NotificationsController(_context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _notificationsController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task GetLatest_ReturnsUpTo5Notifications()
        {
            // Arrange
            var task = new TaskItem { Id = 1, ProjectId = 1, Title = "Task 1" };
            _context.Tasks.Add(task);

            for (int i = 0; i < 6; i++)
            {
                _context.Notifications.Add(new Notification
                {
                    Id = i + 1,
                    UserId = "user1",
                    Type = NotificationType.TaskAssignment,
                    RelatedEntityId = 1, // Will map to task 1 above to resolve ProjectId
                    CreatedAt = DateTime.UtcNow.AddMinutes(i)
                });
            }
            _context.Notifications.Add(new Notification { Id = 10, UserId = "user2", Type = NotificationType.ProjectInvite });

            await _context.SaveChangesAsync();

            // Act
            var result = await _notificationsController.GetLatest() as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var notifications = result.Value as IEnumerable<object>;
            Assert.That(notifications, Is.Not.Null);
            Assert.That(notifications.Count(), Is.EqualTo(5));
        }

        [Test]
        public async Task GetAll_ReturnsAllUserNotifications()
        {
            // Arrange
            _context.Notifications.Add(new Notification { Id = 1, UserId = "user1", Type = NotificationType.WorkspaceInvite, CreatedAt = DateTime.UtcNow });
            _context.Notifications.Add(new Notification { Id = 2, UserId = "user1", Type = NotificationType.ProjectInvite, CreatedAt = DateTime.UtcNow });
            _context.Notifications.Add(new Notification { Id = 3, UserId = "user2", Type = NotificationType.WorkspaceInvite, CreatedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            // Act
            var result = await _notificationsController.GetAll() as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var notifications = result.Value as IEnumerable<object>;
            Assert.That(notifications, Is.Not.Null);
            Assert.That(notifications.Count(), Is.EqualTo(2));
        }

        [Test]
        public async Task MarkAsRead_ValidId_MarksNotificationAsRead()
        {
            // Arrange
            var notification = new Notification { Id = 1, UserId = "user1", Type = NotificationType.WorkspaceInvite, IsRead = false };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Act
            var result = await _notificationsController.MarkAsRead(1) as OkResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbNotification = await _context.Notifications.FindAsync(1);
            Assert.That(dbNotification.IsRead, Is.True);
        }

        [Test]
        public async Task MarkAsRead_InvalidId_ReturnsNotFound()
        {
            // Act
            var result = await _notificationsController.MarkAsRead(999);

            // Assert
            Assert.That(result, Is.InstanceOf<NotFoundResult>());
        }

        [Test]
        public async Task MarkAsRead_OtherUserNotification_ReturnsNotFound()
        {
            // Arrange
            var notification = new Notification { Id = 1, UserId = "user2", Type = NotificationType.WorkspaceInvite, IsRead = false };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Act
            var result = await _notificationsController.MarkAsRead(1);

            // Assert
            Assert.That(result, Is.InstanceOf<NotFoundResult>());
        }
    }
}
