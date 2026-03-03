using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Tests.Services
{
    [TestFixture]
    public class WidgetServiceTests
    {
        private AppDbContext _context;
        private WidgetService _widgetService;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _widgetService = new WidgetService(_context);
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task ExecuteQueryAsync_EmptySource_ReturnsEmptyTaskList()
        {
            // Arrange
            var widget = new DashboardWidget { ProjectId = 1, Source = "" };

            // Act
            var result = await _widgetService.ExecuteQueryAsync(widget);

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.ResultType, Is.EqualTo("TaskList"));
            Assert.That((result.Data as IEnumerable<object>).Any(), Is.False);
        }

        [Test]
        public void ExecuteQueryAsync_InvalidJson_ThrowsArgumentException()
        {
            // Arrange
            var widget = new DashboardWidget { ProjectId = 1, Source = "invalid json" };

            // Act & Assert
            Assert.ThrowsAsync<ArgumentException>(() => _widgetService.ExecuteQueryAsync(widget));
        }

        [Test]
        public async Task ExecuteQueryAsync_TasksQuery_ReturnsFilteredTasks()
        {
             // Arrange
            var projectId = 1;
            
            _context.Tasks.Add(new TaskItem { Id = 1, ProjectId = projectId, Title = "Task 1", Status = "To Do", Completed = false });
            _context.Tasks.Add(new TaskItem { Id = 2, ProjectId = projectId, Title = "Task 2", Status = "Done", Completed = true });
            await _context.SaveChangesAsync();

            var queryDto = new WidgetQueryDto
            {
                Select = "tasks",
                Filters = new List<WidgetFilterDto>
                {
                    new WidgetFilterDto { Field = "status", Op = "=", Value = "To Do" }
                }
            };

            var widget = new DashboardWidget { ProjectId = projectId, Source = JsonSerializer.Serialize(queryDto) };

            // Act
            var result = await _widgetService.ExecuteQueryAsync(widget);

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.ResultType, Is.EqualTo("TaskList"));
            
            var data = result.Data as IEnumerable<object>;
            Assert.That(data.Count(), Is.EqualTo(1));
            
            var firstItem = data.First();
            var title = firstItem.GetType().GetProperty("Title").GetValue(firstItem, null) as string;
            Assert.That(title, Is.EqualTo("Task 1"));
        }

        [Test]
        public async Task ExecuteQueryAsync_TasksQuery_GroupedByStatus_ReturnsGroupedResult()
        {
            // Arrange
            var projectId = 1;
            
            _context.Tasks.Add(new TaskItem { Id = 1, ProjectId = projectId, Title = "Task 1", Status = "To Do", Completed = false });
            _context.Tasks.Add(new TaskItem { Id = 2, ProjectId = projectId, Title = "Task 2", Status = "To Do", Completed = false });
            _context.Tasks.Add(new TaskItem { Id = 3, ProjectId = projectId, Title = "Task 3", Status = "Done", Completed = true });
            await _context.SaveChangesAsync();

            var queryDto = new WidgetQueryDto
            {
                Select = "tasks",
                GroupBy = "status",
                Aggregate = new WidgetAggregateDto { Func = "count" }
            };

            var widget = new DashboardWidget { ProjectId = projectId, Source = JsonSerializer.Serialize(queryDto) };

            // Act
            var result = await _widgetService.ExecuteQueryAsync(widget);

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.ResultType, Is.EqualTo("GroupedResult"));
            
            var data = result.Data as IEnumerable<object>;
            Assert.That(data.Count(), Is.EqualTo(2)); // "To Do" and "Done" groups
        }

        [Test]
        public async Task ExecuteQueryAsync_MembersQuery_ReturnsFilteredMembers()
        {
            // Arrange
            var projectId = 1;
            
            var role1 = new ProjectRole { Id = 1, ProjectId = projectId, RoleName = "Developer" };
            var role2 = new ProjectRole { Id = 2, ProjectId = projectId, RoleName = "Tester" };
            _context.ProjectRoles.AddRange(role1, role2);

            _context.Users.Add(new User { Id = "user1", UserName = "Dev1" });
            _context.Users.Add(new User { Id = "user2", UserName = "Test1" });

            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", ProjectRoleId = 1, ProjectRole = role1, Status = ProjectMemberStatus.Active });
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user2", ProjectRoleId = 2, ProjectRole = role2, Status = ProjectMemberStatus.Active });
            
            await _context.SaveChangesAsync();

            var queryDto = new WidgetQueryDto
            {
                Select = "members",
                Filters = new List<WidgetFilterDto>
                {
                    new WidgetFilterDto { Field = "role", Op = "=", Value = "Developer" }
                }
            };

            var widget = new DashboardWidget { ProjectId = projectId, Source = JsonSerializer.Serialize(queryDto) };

            // Act
            var result = await _widgetService.ExecuteQueryAsync(widget);

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.ResultType, Is.EqualTo("MemberList"));
            
            var data = result.Data as IEnumerable<object>;
            Assert.That(data.Count(), Is.EqualTo(1));
            
            var firstItem = data.First();
            var userName = firstItem.GetType().GetProperty("UserName").GetValue(firstItem, null) as string;
            Assert.That(userName, Is.EqualTo("Dev1"));
        }
    }
}
