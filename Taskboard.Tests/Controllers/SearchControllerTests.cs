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
    public class SearchControllerTests
    {
        private AppDbContext _context;
        private SearchController _controller;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _controller = new SearchController(_context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
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
        public async Task Search_EmptyQuery_ReturnsEmpty()
        {
            // Act
            var result = await _controller.Search("") as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var tasks = t.GetProperty("tasks").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(tasks.Cast<object>().Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task Search_WhitespaceQuery_ReturnsEmpty()
        {
            var result = await _controller.Search("   ") as OkObjectResult;
            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var tasks = t.GetProperty("tasks").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(tasks.Cast<object>().Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task Search_MatchingWorkspace_ReturnsIt()
        {
            // Arrange
            _context.Workspaces.Add(new Workspace { Id = 1, Name = "Alpha Workspace" });
            _context.Workspaces.Add(new Workspace { Id = 2, Name = "Beta Workspace" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = 1, UserId = "user1", Status = "Active" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = 2, UserId = "user1", Status = "Active" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.Search("alpha") as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var workspaces = t.GetProperty("workspaces").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(workspaces.Cast<object>().Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task Search_WorkspaceUserIsNotMemberOf_IsNotReturned()
        {
            // Arrange
            _context.Workspaces.Add(new Workspace { Id = 1, Name = "Secret Workspace" });
            // user1 is NOT a member
            await _context.SaveChangesAsync();

            var result = await _controller.Search("secret") as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var workspaces = t.GetProperty("workspaces").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(workspaces.Cast<object>().Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task Search_MatchingProject_ReturnsIt()
        {
            // Arrange
            _context.Projects.Add(new Project { Id = 1, Name = "Search Project" });
            _context.Projects.Add(new Project { Id = 2, Name = "Other Project" });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Active });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 2, UserId = "user1", Status = ProjectMemberStatus.Active });
            await _context.SaveChangesAsync();

            var result = await _controller.Search("search proj") as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var projects = t.GetProperty("projects").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(projects.Cast<object>().Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task Search_PendingProjectMember_ProjectNotReturned()
        {
            // Arrange
            _context.Projects.Add(new Project { Id = 1, Name = "Pending Project" });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Pending });
            await _context.SaveChangesAsync();

            var result = await _controller.Search("pending") as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var projects = t.GetProperty("projects").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(projects.Cast<object>().Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task Search_MatchingTask_ReturnsIt()
        {
            // Arrange
            _context.Projects.Add(new Project { Id = 1, Name = "My Project" });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Active });
            _context.Tasks.Add(new TaskItem { Id = 1, ProjectId = 1, Title = "Fix login bug" });
            _context.Tasks.Add(new TaskItem { Id = 2, ProjectId = 1, Title = "Add new feature" });
            await _context.SaveChangesAsync();

            var result = await _controller.Search("login") as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var tasks = t.GetProperty("tasks").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(tasks.Cast<object>().Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task Search_TaskInProjectUserIsNotMemberOf_NotReturned()
        {
            // Arrange
            _context.Projects.Add(new Project { Id = 1, Name = "Restricted" });
            // No ProjectMember for user1
            _context.Tasks.Add(new TaskItem { Id = 1, ProjectId = 1, Title = "Secret Task" });
            await _context.SaveChangesAsync();

            var result = await _controller.Search("secret") as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var tasks = t.GetProperty("tasks").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(tasks.Cast<object>().Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task Search_CaseInsensitive_ReturnResults()
        {
            // Arrange
            _context.Workspaces.Add(new Workspace { Id = 1, Name = "Design Studio" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = 1, UserId = "user1", Status = "Active" });
            await _context.SaveChangesAsync();

            var result = await _controller.Search("DESIGN") as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var t = result.Value.GetType();
            var workspaces = t.GetProperty("workspaces").GetValue(result.Value) as System.Collections.IEnumerable;
            Assert.That(workspaces.Cast<object>().Count(), Is.EqualTo(1));
        }
    }
}
