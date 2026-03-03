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
using Taskboard.Controllers;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Tests.Controllers
{
    [TestFixture]
    public class WorkspacesControllerTests
    {
        private AppDbContext _context;
        private Mock<INotificationService> _notificationServiceMock;
        private WorkspacesController _workspacesController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _notificationServiceMock = new Mock<INotificationService>();
            
            _workspacesController = new WorkspacesController(_context, _notificationServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _workspacesController.ControllerContext = new ControllerContext
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
        public async Task GetWorkspace_UserIsMember_ReturnsWorkspace()
        {
            // Arrange
            var workspaceId = 1;
            _context.Workspaces.Add(new Workspace { Id = workspaceId, Name = "Test Workspace" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "user1", Status = "Active" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _workspacesController.GetWorkspace(workspaceId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
        }

        [Test]
        public async Task GetWorkspace_UserIsNotMember_ReturnsForbid()
        {
            // Arrange
            var workspaceId = 1;
            _context.Workspaces.Add(new Workspace { Id = workspaceId, Name = "Test Workspace" });
            // User is not a member
            await _context.SaveChangesAsync();

            // Act
            var result = await _workspacesController.GetWorkspace(workspaceId);

            // Assert
            Assert.That(result, Is.InstanceOf<ForbidResult>());
        }

        [Test]
        public async Task CreateWorkspace_ValidData_CreatesAndReturnsWorkspace()
        {
            // Arrange
            var request = new CreateWorkspaceRequest { Name = "New Workspace" };

            // Act
            var result = await _workspacesController.CreateWorkspace(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbWorkspace = await _context.Workspaces.FirstOrDefaultAsync(w => w.Name == "New Workspace");
            Assert.That(dbWorkspace, Is.Not.Null);

            var dbMember = await _context.WorkspaceMembers.FirstOrDefaultAsync(wm => wm.WorkspaceId == dbWorkspace.Id && wm.UserId == "user1");
            Assert.That(dbMember, Is.Not.Null);
            Assert.That(dbMember.Role, Is.EqualTo("Owner"));
        }

        [Test]
        public async Task InviteMember_UserIsOwner_SendsInvite()
        {
            // Arrange
            var workspaceId = 1;
            var inviteeEmail = "invitee@test.com";
            var inviteeId = "user2";

            _context.Workspaces.Add(new Workspace { Id = workspaceId, Name = "Test Workspace" });
            _context.Users.Add(new User { Id = "user1", UserName = "Inviter" });
            _context.Users.Add(new User { Id = inviteeId, Email = inviteeEmail, UserName = "Invitee" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "user1", Role = "Owner", Status = "Active" });
            
            await _context.SaveChangesAsync();

            var request = new AddWorkspaceMemberRequest { Email = inviteeEmail };

            // Act
            var result = await _workspacesController.InviteMember(workspaceId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);

            var pendingMember = await _context.WorkspaceMembers.FirstOrDefaultAsync(wm => wm.WorkspaceId == workspaceId && wm.UserId == inviteeId);
            Assert.That(pendingMember, Is.Not.Null);
            Assert.That(pendingMember.Status, Is.EqualTo("Pending"));

            _notificationServiceMock.Verify(ns => ns.SendWorkspaceInviteAsync(
                It.IsAny<Workspace>(), 
                It.Is<User>(u => u.Id == "user1"), 
                It.Is<User>(u => u.Id == inviteeId)), 
                Times.Once);
        }

        [Test]
        public async Task AcceptInvite_WithPendingInvite_SetsStatusToActive()
        {
            // Arrange
            var workspaceId = 1;
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "user1", Status = "Pending" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _workspacesController.AcceptInvite(workspaceId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var member = await _context.WorkspaceMembers.FirstOrDefaultAsync(wm => wm.WorkspaceId == workspaceId && wm.UserId == "user1");
            Assert.That(member.Status, Is.EqualTo("Active"));
        }

        [Test]
        public async Task RemoveMember_UserIsOwner_RemovesTargetMember()
        {
             // Arrange
            var workspaceId = 1;
            var targetUserId = "user2";

            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "user1", Role = "Owner", Status = "Active" });
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = targetUserId, Role = "Member", Status = "Active" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _workspacesController.RemoveMember(workspaceId, targetUserId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var targetMember = await _context.WorkspaceMembers.FirstOrDefaultAsync(wm => wm.WorkspaceId == workspaceId && wm.UserId == targetUserId);
            Assert.That(targetMember, Is.Null);
        }

        [Test]
        public async Task LeaveWorkspace_UserIsMember_RemovesSelf()
        {
            // Arrange
            var workspaceId = 1;
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "user1", Role = "Member", Status = "Active" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _workspacesController.LeaveWorkspace(workspaceId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var membership = await _context.WorkspaceMembers.FirstOrDefaultAsync(wm => wm.WorkspaceId == workspaceId && wm.UserId == "user1");
            Assert.That(membership, Is.Null);
        }
    }
}
