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
    public class ProjectMembersControllerTests
    {
        private AppDbContext _context;
        private Mock<INotificationService> _notificationServiceMock;
        private Mock<IProjectAccessService> _projectAccessServiceMock;
        private ProjectMembersController _projectMembersController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _notificationServiceMock = new Mock<INotificationService>();
            _projectAccessServiceMock = new Mock<IProjectAccessService>();

            _projectMembersController = new ProjectMembersController(_context, _notificationServiceMock.Object, _projectAccessServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _projectMembersController.ControllerContext = new ControllerContext
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
        public async Task GetProjectMembersAndRoles_WithViewAccess_ReturnsData()
        {
            // Arrange
            var projectId = 1;
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);
            
            var role = new ProjectRole { Id = 1, ProjectId = projectId, RoleName = "Developer" };
            _context.ProjectRoles.Add(role);

            var user = new User { Id = "user2", UserName = "TestUser" };
            _context.Users.Add(user);

            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user2", ProjectRoleId = 1, User = user, ProjectRole = role });
            await _context.SaveChangesAsync();

            _projectAccessServiceMock.Setup(x => x.GetMembershipAsync(projectId, "user1"))
                .ReturnsAsync(new ProjectMember { ProjectRole = role });

            // Act
            var result = await _projectMembersController.GetProjectMembersAndRoles(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var t = result.Value.GetType();
            var members = t.GetProperty("members").GetValue(result.Value, null) as IEnumerable<object>;
            Assert.That(members.Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task AddProjectMember_WithPermission_AddsPendingMemberAndSendsInvite()
        {
            // Arrange
            var projectId = 1;
            var inviteeEmail = "invitee@test.com";

            var inviterRole = new ProjectRole { Id = 1, ProjectId = projectId, CanAddEditMembers = true };
            _context.ProjectRoles.Add(inviterRole);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = inviterRole });
            
            var assignRole = new ProjectRole { Id = 2, ProjectId = projectId, RoleName = "Member" };
            _context.ProjectRoles.Add(assignRole);

            _context.Users.Add(new User { Id = "user2", Email = inviteeEmail });
            _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
            _context.Users.Add(new User { Id = "user1" });
            await _context.SaveChangesAsync();

            var request = new AddMemberRequest { Email = inviteeEmail, RoleId = 2 };

            // Act
            var result = await _projectMembersController.AddProjectMember(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var addedMember = await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == "user2");
            Assert.That(addedMember, Is.Not.Null);
            Assert.That(addedMember.Status, Is.EqualTo(ProjectMemberStatus.Pending));

            _notificationServiceMock.Verify(x => x.SendProjectInviteAsync(
                It.IsAny<Project>(), 
                It.Is<User>(u => u.Id == "user1"), 
                It.Is<List<User>>(list => list.Any(u => u.Id == "user2"))), 
                Times.Once);
        }

        [Test]
        public async Task AcceptInvite_WithPendingInvite_SetsActive()
        {
            // Arrange
            var projectId = 1;
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Pending });
            await _context.SaveChangesAsync();

             // Act
            // Note: Route for accept is POST /api/projects/{projectId}/members/accept-invite
            // In the controller it's just accept-invite but uses projectId from route
            var result = await _projectMembersController.AcceptInvite(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var member = await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == "user1");
            Assert.That(member.Status, Is.EqualTo(ProjectMemberStatus.Active));
        }

        [Test]
        public async Task DeleteProjectMember_WithPermission_RemovesMember()
        {
            // Arrange
            var projectId = 1;
            var targetUserId = "user2";

            var inviterRole = new ProjectRole { Id = 1, ProjectId = projectId, CanAddEditMembers = true };
            var memberRole = new ProjectRole { Id = 2, ProjectId = projectId, IsOwner = false };
            _context.ProjectRoles.AddRange(inviterRole, memberRole);

            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = inviterRole });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = targetUserId, Status = ProjectMemberStatus.Active, ProjectRoleId = 2, ProjectRole = memberRole });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectMembersController.DeleteProjectMember(projectId, targetUserId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var targetMember = await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == targetUserId);
            Assert.That(targetMember, Is.Null);
        }
    }
}
