using System;
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
    public class HomeControllerTests
    {
        private AppDbContext _context;
        private HomeController _homeController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _homeController = new HomeController(_context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _homeController.ControllerContext = new ControllerContext
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
        public async Task GetHomeData_ReturnsUserWorkspacesProjectsAndTasks()
        {
            // Arrange
            var workspace1 = new Workspace { Id = 1, Name = "Workspace 1" };
            var workspace2 = new Workspace { Id = 2, Name = "Workspace 2" };
            _context.Workspaces.AddRange(workspace1, workspace2);

            _context.WorkspaceMembers.Add(new WorkspaceMember { UserId = "user1", WorkspaceId = 1, Status = "Active", JoinedAt = DateTime.UtcNow.AddDays(-2), LastVisitedAt = DateTime.UtcNow.AddMinutes(-5) });
            _context.WorkspaceMembers.Add(new WorkspaceMember { UserId = "user1", WorkspaceId = 2, Status = "Active", JoinedAt = DateTime.UtcNow.AddDays(-1) }); // No last visited
            _context.WorkspaceMembers.Add(new WorkspaceMember { UserId = "user2", WorkspaceId = 2, Status = "Active" }); // Different user

            var project1 = new Project { Id = 1, Name = "Project 1", WorkspaceId = 1 };
            _context.Projects.Add(project1);

            _context.ProjectMembers.Add(new ProjectMember { UserId = "user1", ProjectId = 1, Status = ProjectMemberStatus.Active, JoinedAt = DateTime.UtcNow.AddDays(-1) });
            _context.ProjectMembers.Add(new ProjectMember { UserId = "user1", ProjectId = 2, Status = ProjectMemberStatus.Pending }); // Pending, should be ignored

            var task1 = new TaskItem { Id = 1, Title = "Task 1", ProjectId = 1, Completed = false };
            var task2 = new TaskItem { Id = 2, Title = "Task 2", ProjectId = 1, Completed = true }; // Completed, ignored
            _context.Tasks.AddRange(task1, task2);

            _context.UserTasks.Add(new UserTask { UserId = "user1", TaskItemId = 1 });
            _context.UserTasks.Add(new UserTask { UserId = "user1", TaskItemId = 2 });
            _context.UserTasks.Add(new UserTask { UserId = "user2", TaskItemId = 1 }); // Other user
            
            await _context.SaveChangesAsync();

            // Act
            var result = await _homeController.GetHomeData() as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            // Extract dynamic or anonymous type results via reflection or JSON serialization.
            // Using dynamic for simpler assertions
            dynamic data = result.Value;
            
            // Note: Asserting on anonymous types directly in a dynamic object isn't completely trivial 
            // without casting or serializing, but we can verify the properties exist and their count.
            var t = result.Value.GetType();
            
            // Get IEnumerable properties
            var workspaces = t.GetProperty("Workspaces").GetValue(result.Value, null) as System.Collections.IEnumerable;
            var projects = t.GetProperty("Projects").GetValue(result.Value, null) as System.Collections.IEnumerable;
            var tasks = t.GetProperty("Tasks").GetValue(result.Value, null) as System.Collections.IEnumerable;

            Assert.That(workspaces.Cast<object>().Count(), Is.EqualTo(2));
            Assert.That(projects.Cast<object>().Count(), Is.EqualTo(1));
            Assert.That(tasks.Cast<object>().Count(), Is.EqualTo(1));

            // Optional: You could assert ordering by looking at the first element
        }

        [Test]
        public async Task GetHomeData_WhenUserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            _homeController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };

            // Act
            var result = await _homeController.GetHomeData();

            // Assert
            Assert.That(result, Is.InstanceOf<UnauthorizedResult>());
        }
    }
}
