using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using NUnit.Framework;
using Taskboard.Contracts.Projects;
using Taskboard.Controllers.Projects;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Tests.Controllers.Projects
{
    [TestFixture]
    public class ProjectsControllerTests
    {
        private AppDbContext _context;
        private Mock<INotificationService> _notificationServiceMock;
        private Mock<IProjectAccessService> _projectAccessServiceMock;
        private ProjectsController _projectsController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _notificationServiceMock = new Mock<INotificationService>();
            _projectAccessServiceMock = new Mock<IProjectAccessService>();

            _projectsController = new ProjectsController(_context, _notificationServiceMock.Object, _projectAccessServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _projectsController.ControllerContext = new ControllerContext
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
        public async Task CreateProject_WithWorkspaceMember_CreatesProjectAndDefaults()
        {
             // Arrange
            var workspaceId = 1;

            _context.Users.Add(new User { Id = "user1" });
            _context.Workspaces.Add(new Workspace { Id = workspaceId, Name = "Test WS" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "user1", Status = "Active" });
            await _context.SaveChangesAsync();

            var request = new CreateProjectRequest
            {
                Name = "New Project",
                WorkspaceId = workspaceId,
                AccessLevel = ProjectAccessLevel.Private,
                MemberEmails = new List<string>()
            };

            // Act
            var result = await _projectsController.CreateProject(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Name == "New Project");
            Assert.That(project, Is.Not.Null);
            Assert.That(project.WorkspaceId, Is.EqualTo(workspaceId));

            // Check defaults
            var statuses = await _context.UserTaskStatuses.Where(ts => ts.ProjectId == project.Id).ToListAsync();
            Assert.That(statuses.Count, Is.EqualTo(3)); // To Do, In Progress, Done

            var roles = await _context.ProjectRoles.Where(pr => pr.ProjectId == project.Id).ToListAsync();
            Assert.That(roles.Count, Is.EqualTo(2)); // Owner, Member
        }

        [Test]
        public async Task GetTaskStatuses_ReturnsStatuses_InitializesIfEmpty()
        {
            // Arrange
            var projectId = 1;
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);
            
            // Note: Project exists but has no statuses
            _context.Projects.Add(new Project { Id = projectId, Name = "Legacy Project" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectsController.GetTaskStatuses(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var statuses = result.Value as IEnumerable<UserTaskStatus>;
            Assert.That(statuses, Is.Not.Null);
            Assert.That(statuses.Count(), Is.EqualTo(3)); // Should auto-initialize 3 defaults

            var dbStatuses = await _context.UserTaskStatuses.Where(ts => ts.ProjectId == projectId).ToListAsync();
            Assert.That(dbStatuses.Count, Is.EqualTo(3));
        }

        [Test]
        public async Task CreateTaskStatus_WithPermission_CreatesStatus()
        {
            // Arrange
            var projectId = 1;
            
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanCreateDeleteTaskStatuses = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role, Status = ProjectMemberStatus.Active });
            await _context.SaveChangesAsync();

            var request = new CreateUserTaskStatusRequest { Name = "Blocked" };

            // Act
            var result = await _projectsController.CreateTaskStatus(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbStatus = await _context.UserTaskStatuses.FirstOrDefaultAsync(ts => ts.Name == "Blocked");
            Assert.That(dbStatus, Is.Not.Null);
            Assert.That(dbStatus.ProjectId, Is.EqualTo(projectId));
        }

        [Test]
        public async Task UpdateProject_WithPermission_UpdatesDetails()
        {
             // Arrange
            var projectId = 1;
            
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanEditProjectSettings = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role, Status = ProjectMemberStatus.Active });
            _context.Projects.Add(new Project { Id = projectId, Name = "Old Name" });
            await _context.SaveChangesAsync();

            var request = new UpdateProjectRequest { Name = "New Name", AccessLevel = ProjectAccessLevel.Public };

            // Act
            var result = await _projectsController.UpdateProject(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbProject = await _context.Projects.FindAsync(projectId);
            Assert.That(dbProject.Name, Is.EqualTo("New Name"));
            Assert.That(dbProject.AccessLevel, Is.EqualTo(ProjectAccessLevel.Public));
        }

        [Test]
        public async Task DeleteProject_UserIsOwner_DeletesProjectAndDependencies()
        {
            // Arrange
            var projectId = 1;
            
            var ownerRole = new ProjectRole { Id = 1, ProjectId = projectId, IsOwner = true };
            _context.ProjectRoles.Add(ownerRole);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = ownerRole, Status = ProjectMemberStatus.Active });
            _context.Projects.Add(new Project { Id = projectId, Name = "To Delete" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectsController.DeleteProject(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            
            var dbProject = await _context.Projects.FindAsync(projectId);
            Assert.That(dbProject, Is.Null);

            var rolesLeft = await _context.ProjectRoles.Where(pr => pr.ProjectId == projectId).ToListAsync();
            Assert.That(rolesLeft, Is.Empty);

             var membersLeft = await _context.ProjectMembers.Where(pm => pm.ProjectId == projectId).ToListAsync();
            Assert.That(membersLeft, Is.Empty);
        }
    }
}
