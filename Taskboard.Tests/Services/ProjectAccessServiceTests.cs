using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Tests.Services
{
    [TestFixture]
    public class ProjectAccessServiceTests
    {
        private AppDbContext _context;
        private ProjectAccessService _projectAccessService;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _projectAccessService = new ProjectAccessService(_context);
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task HasViewAccessAsync_ProjectPublic_ReturnsTrue()
        {
            // Arrange
            _context.Projects.Add(new Project { Id = 1, AccessLevel = ProjectAccessLevel.Public });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.HasViewAccessAsync(1, "user1");

            // Assert
            Assert.That(result, Is.True);
        }

        [Test]
        public async Task HasViewAccessAsync_ProjectWorkspace_UserIsWorkspaceMember_ReturnsTrue()
        {
             // Arrange
            _context.Projects.Add(new Project { Id = 1, WorkspaceId = 1, AccessLevel = ProjectAccessLevel.Workspace });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = 1, UserId = "user1" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.HasViewAccessAsync(1, "user1");

            // Assert
            Assert.That(result, Is.True);
        }

        [Test]
        public async Task HasViewAccessAsync_ProjectWorkspace_UserIsNotWorkspaceMember_ReturnsFalse()
        {
             // Arrange
            _context.Projects.Add(new Project { Id = 1, WorkspaceId = 1, AccessLevel = ProjectAccessLevel.Workspace });
            // User is not member of workspace
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.HasViewAccessAsync(1, "user1");

            // Assert
            Assert.That(result, Is.False);
        }

        [Test]
        public async Task HasViewAccessAsync_ProjectPrivate_UserIsActiveProjectMember_ReturnsTrue()
        {
             // Arrange
            _context.Projects.Add(new Project { Id = 1, AccessLevel = ProjectAccessLevel.Private });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Active });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.HasViewAccessAsync(1, "user1");

            // Assert
            Assert.That(result, Is.True);
        }

        [Test]
        public async Task HasViewAccessAsync_ProjectPrivate_UserIsPendingProjectMember_ReturnsFalse()
        {
             // Arrange
            _context.Projects.Add(new Project { Id = 1, AccessLevel = ProjectAccessLevel.Private });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Pending });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.HasViewAccessAsync(1, "user1");

            // Assert
            Assert.That(result, Is.False);
        }

        [Test]
        public async Task GetMembershipAsync_UserIsActiveMember_ReturnsMembershipWithRole()
        {
             // Arrange
            var role = new ProjectRole { Id = 1, ProjectId = 1, RoleName = "Test Role" };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = role });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.GetMembershipAsync(1, "user1");

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.ProjectRole, Is.Not.Null);
            Assert.That(result.ProjectRole.RoleName, Is.EqualTo("Test Role"));
        }

        [Test]
        public async Task GetMembershipAsync_UserIsPendingMember_ReturnsNull()
        {
             // Arrange
             _context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = "user1", Status = ProjectMemberStatus.Pending });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectAccessService.GetMembershipAsync(1, "user1");

            // Assert
            Assert.That(result, Is.Null);
        }
    }
}
