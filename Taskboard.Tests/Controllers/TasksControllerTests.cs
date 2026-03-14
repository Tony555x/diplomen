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
using Taskboard.Contracts;
using Taskboard.Contracts.Projects;

namespace Taskboard.Tests.Controllers
{
    [TestFixture]
    public class TasksControllerTests
    {
        private AppDbContext _context;
        private Mock<INotificationService> _notificationServiceMock;
        private Mock<IProjectAccessService> _projectAccessServiceMock;
        private TasksController _tasksController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _notificationServiceMock = new Mock<INotificationService>();
            _projectAccessServiceMock = new Mock<IProjectAccessService>();

            _tasksController = new TasksController(_context, _notificationServiceMock.Object, _projectAccessServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _tasksController.ControllerContext = new ControllerContext
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
        public async Task GetProjectTasks_WithViewAccess_ReturnsTasks()
        {
            // Arrange
            var projectId = 1;
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);

            _context.Tasks.Add(new TaskItem { Id = 1, ProjectId = projectId, Title = "Task 1", Status = "To Do" });
            _context.Tasks.Add(new TaskItem { Id = 2, ProjectId = projectId, Title = "Task 2", Status = "In Progress" });
            _context.Tasks.Add(new TaskItem { Id = 3, ProjectId = 99, Title = "Other Project Task" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _tasksController.GetProjectTasks(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var tasks = result.Value as IEnumerable<object>;
            Assert.That(tasks, Is.Not.Null);
            Assert.That(tasks.Count(), Is.EqualTo(2));
        }

        [Test]
        public async Task GetProjectTasks_WithoutViewAccess_ReturnsForbid()
        {
            // Arrange
            var projectId = 1;
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(false);

            // Act
            var result = await _tasksController.GetProjectTasks(projectId);

            // Assert
            Assert.That(result, Is.InstanceOf<ForbidResult>());
        }

        [Test]
        public async Task CreateTask_WithCreatePermission_AddsTask()
        {
            // Arrange
            var projectId = 1;
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanCreateEditDeleteTasks = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = role });
            await _context.SaveChangesAsync();

            var request = new CreateTaskRequest { Title = "New Task", Status = "To Do" };

            // Act
            var result = await _tasksController.CreateTask(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Title == "New Task");
            Assert.That(dbTask, Is.Not.Null);
            Assert.That(dbTask.ProjectId, Is.EqualTo(projectId));
        }

        [Test]
        public async Task CreateTask_WithoutCreatePermission_ReturnsForbid()
        {
             // Arrange
            var projectId = 1;
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanCreateEditDeleteTasks = false };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = role });
            await _context.SaveChangesAsync();

            var request = new CreateTaskRequest { Title = "New Task", Status = "To Do" };

            // Act
            var result = await _tasksController.CreateTask(projectId, request);

            // Assert
            Assert.That(result, Is.InstanceOf<ForbidResult>());
        }

        [Test]
        public async Task CreateTask_WithParentTaskId_AddsSubtask()
        {
            // Arrange
            var projectId = 1;
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanCreateEditDeleteTasks = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = role });
            
            var parentTask = new TaskItem { Id = 10, ProjectId = projectId, Title = "Parent Task" };
            _context.Tasks.Add(parentTask);
            await _context.SaveChangesAsync();

            var request = new CreateTaskRequest { Title = "Subtask", Status = "To Do", ParentTaskId = 10 };

            // Act
            var result = await _tasksController.CreateTask(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Title == "Subtask");
            Assert.That(dbTask, Is.Not.Null);
            Assert.That(dbTask.ParentTaskId, Is.EqualTo(10));
        }

        [Test]
        public async Task CreateTask_WithNestedParentTaskId_ReturnsBadRequest()
        {
            // Arrange
            var projectId = 1;
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanCreateEditDeleteTasks = true };
            _context.ProjectRoles.Add(role);
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active, ProjectRoleId = 1, ProjectRole = role });
            
            var parentTask = new TaskItem { Id = 10, ProjectId = projectId, Title = "Parent Task" };
            var subTask = new TaskItem { Id = 11, ProjectId = projectId, Title = "Subtask", ParentTaskId = 10 };
            _context.Tasks.Add(parentTask);
            _context.Tasks.Add(subTask);
            await _context.SaveChangesAsync();

            var request = new CreateTaskRequest { Title = "Subtask 2", Status = "To Do", ParentTaskId = 11 };

            // Act
            var result = await _tasksController.CreateTask(projectId, request) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
        }

        [Test]
        public async Task UpdateTask_WithEditPermission_UpdatesTask()
        {
            // Arrange
            var projectId = 1;
            var taskId = 1;
            
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);
            var role = new ProjectRole { Id = 1, ProjectId = projectId, CanCreateEditDeleteTasks = true };
            _projectAccessServiceMock.Setup(x => x.GetMembershipAsync(projectId, "user1")).ReturnsAsync(new ProjectMember { ProjectRole = role });

            var task = new TaskItem { Id = taskId, ProjectId = projectId, Title = "Old Title", Status = "To Do" };
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            var request = new UpdateTaskRequest { Title = "New Title", Status = "In Progress", Completed = false };

            // Act
            var result = await _tasksController.UpdateTask(projectId, taskId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbTask = await _context.Tasks.FindAsync(taskId);
            Assert.That(dbTask.Title, Is.EqualTo("New Title"));
            Assert.That(dbTask.Status, Is.EqualTo("In Progress"));
        }

        [Test]
        public async Task AssignUserToTask_AssignsUserAndSendsNotification()
        {
            // Arrange
            var projectId = 1;
            var taskId = 1;
            var assigneeId = "user2";

            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);

            _context.Tasks.Add(new TaskItem { Id = taskId, ProjectId = projectId, Title = "Task to Assign" });
            _context.Users.Add(new User { Id = assigneeId, UserName = "Assignee" });
            _context.Users.Add(new User { Id = "user1", UserName = "Assigner" });
            
            // Assignee must be an active project member
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = assigneeId, Status = ProjectMemberStatus.Active });
            
            await _context.SaveChangesAsync();

            var request = new AssignUserRequest { UserId = assigneeId };

            // Act
            var result = await _tasksController.AssignUserToTask(projectId, taskId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            
            var assignment = await _context.UserTasks.FirstOrDefaultAsync(ut => ut.TaskItemId == taskId && ut.UserId == assigneeId);
            Assert.That(assignment, Is.Not.Null);

            _notificationServiceMock.Verify(x => x.SendTaskAssignmentAsync(
                It.Is<TaskItem>(t => t.Id == taskId), 
                It.Is<User>(u => u.Id == "user1"), 
                It.Is<User>(u => u.Id == assigneeId)), Times.Once);
        }
    }
}
