using System;
using System.Diagnostics;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Contracts.Projects;
using Taskboard.Controllers.Projects;
using Taskboard.Data;
using Taskboard.Data.Models;

namespace Taskboard.Tests.Controllers.Projects
{
    [TestFixture]
    public class ProjectRolesControllerTests
    {
        private AppDbContext _context;
        private ProjectRolesController _projectRolesController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _projectRolesController = new ProjectRolesController(_context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _projectRolesController.ControllerContext = new ControllerContext
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
        public async Task CreateProjectRole_WithPermission_CreatesRole()
        {
            // Arrange
            var projectId = 1;

            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanAddEditMembers = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role });
            await _context.SaveChangesAsync();

            var request = new CreateProjectRoleRequest 
            { 
                RoleName = "New Role",
                CanAddEditMembers = true,
                CanEditProjectSettings = false,
                CanCreateEditDeleteTasks = true,
                CanCreateDeleteTaskStatuses = false
            };

            // Act
            var result = await _projectRolesController.CreateProjectRole(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbRole = await _context.ProjectRoles.FirstOrDefaultAsync(pr => pr.RoleName == "New Role");
            Assert.That(dbRole, Is.Not.Null);
            Assert.That(dbRole.ProjectId, Is.EqualTo(projectId));
            Assert.That(dbRole.CanCreateEditDeleteTasks, Is.True);
        }

        [Test]
        public async Task CreateProjectRole_UpdatesExistingRole_WhenRoleIdProvided()
        {
           // Arrange
            var projectId = 1;
            
            var roleToUpdate = new ProjectRole { Id = 2, ProjectId = projectId, RoleName = "Old Role", IsOwner = false };
            var memberRole = new ProjectRole { Id = 1, ProjectId = projectId, CanAddEditMembers = true };
            _context.ProjectRoles.AddRange(roleToUpdate, memberRole);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = memberRole });
            await _context.SaveChangesAsync();

            var request = new CreateProjectRoleRequest 
            { 
                RoleId = 2,
                RoleName = "Updated Role"
            };

            // Act
            var result = await _projectRolesController.CreateProjectRole(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            
            var dbRole = await _context.ProjectRoles.FindAsync(2);
            Assert.That(dbRole.RoleName, Is.EqualTo("Updated Role"));
        }

        [Test]
        public async Task DeleteProjectRole_WithPermission_NotInUse_DeletesRole()
        {
             // Arrange
            var projectId = 1;
            
            var roleToDelete = new ProjectRole { Id = 2, ProjectId = projectId, RoleName = "To Delete", IsOwner = false };
            var memberRole = new ProjectRole { Id = 1, ProjectId = projectId, CanAddEditMembers = true };
            _context.ProjectRoles.AddRange(roleToDelete, memberRole);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = memberRole });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectRolesController.DeleteProjectRole(projectId, 2) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbRole = await _context.ProjectRoles.FindAsync(2);
            Assert.That(dbRole, Is.Null);
        }

        [Test]
        public async Task DeleteProjectRole_RoleInUse_ReturnsBadRequest()
        {
            // Arrange
            var projectId = 1;
            
            var roleToDelete = new ProjectRole { Id = 2, ProjectId = projectId, RoleName = "To Delete", IsOwner = false };
            var memberRole = new ProjectRole { Id = 1, ProjectId = projectId, CanAddEditMembers = true };
            _context.ProjectRoles.AddRange(roleToDelete, memberRole);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = memberRole });
            
            // Assign role to another user
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user2", ProjectRoleId = 2, ProjectRole = roleToDelete });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectRolesController.DeleteProjectRole(projectId, 2) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
        }
    }
}
