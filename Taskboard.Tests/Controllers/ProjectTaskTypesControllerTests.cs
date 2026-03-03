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
    public class ProjectTaskTypesControllerTests
    {
        private AppDbContext _context;
        private Mock<IProjectAccessService> _projectAccessServiceMock;
        private ProjectTaskTypesController _projectTaskTypesController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _projectAccessServiceMock = new Mock<IProjectAccessService>();

            _projectTaskTypesController = new ProjectTaskTypesController(_context, _projectAccessServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _projectTaskTypesController.ControllerContext = new ControllerContext
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
        public async Task GetProjectTaskTypes_WithViewAccess_ReturnsData()
        {
            // Arrange
            var projectId = 1;
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);

            var taskType = new TaskType { Id = 1, ProjectId = projectId, Name = "Bug", Icon = "bug-icon" };
            _context.TaskTypes.Add(taskType);
            _context.TaskFields.Add(new TaskField { Id = 1, TaskTypeId = 1, Name = "Priority", Type = FieldType.Select });
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectTaskTypesController.GetProjectTaskTypes(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var t = result.Value.GetType();
            var success = t.GetProperty("success").GetValue(result.Value, null) as bool?;
            Assert.That(success, Is.True);
            var taskTypes = t.GetProperty("taskTypes").GetValue(result.Value, null) as IEnumerable<object>;
            Assert.That(taskTypes.Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task UpsertTaskType_WithPermission_CreatesNewTaskType()
        {
            // Arrange
            var projectId = 1;
            
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanEditProjectSettings = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role });
            await _context.SaveChangesAsync();

            var request = new UpsertTaskTypeRequest
            {
                Name = "Feature",
                Description = "New feature request",
                Icon = "star",
                Fields = new List<UpsertTaskFieldRequest>
                {
                    new UpsertTaskFieldRequest { Name = "Story Points", Type = FieldType.Number }
                }
            };

            // Act
            var result = await _projectTaskTypesController.UpsertTaskType(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbTaskType = await _context.TaskTypes.Include(tt => tt.Fields).FirstOrDefaultAsync(tt => tt.Name == "Feature");
            Assert.That(dbTaskType, Is.Not.Null);
            Assert.That(dbTaskType.Icon, Is.EqualTo("star"));
            Assert.That(dbTaskType.Fields.Count, Is.EqualTo(1));
            Assert.That(dbTaskType.Fields.First().Name, Is.EqualTo("Story Points"));
        }

        [Test]
        public async Task DeleteTaskType_WithPermission_NotInUse_DeletesTaskType()
        {
             // Arrange
            var projectId = 1;
            
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanEditProjectSettings = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role });
            
            var taskType = new TaskType { Id = 2, ProjectId = projectId, Name = "To Delete" };
            _context.TaskTypes.Add(taskType);
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectTaskTypesController.DeleteTaskType(projectId, 2) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbTaskType = await _context.TaskTypes.FindAsync(2);
            Assert.That(dbTaskType, Is.Null);
        }

        [Test]
        public async Task DeleteTaskType_InUse_ReturnsBadRequest()
        {
             // Arrange
            var projectId = 1;
            
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanEditProjectSettings = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role });
            
            var taskType = new TaskType { Id = 2, ProjectId = projectId, Name = "In Use" };
            _context.TaskTypes.Add(taskType);
            
            var taskInUse = new TaskItem { Id = 1, ProjectId = projectId, Title = "Using Type", TaskTypeId = 2 };
            _context.Tasks.Add(taskInUse);
            await _context.SaveChangesAsync();

            // Act
            var result = await _projectTaskTypesController.DeleteTaskType(projectId, 2) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
        }
    }
}
