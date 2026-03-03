using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
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
    public class DashboardControllerTests
    {
        private AppDbContext _context;
        private Mock<IWidgetService> _widgetServiceMock;
        private Mock<UserManager<User>> _userManagerMock;
        private DashboardController _dashboardController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            
            _widgetServiceMock = new Mock<IWidgetService>();
            
            var store = new Mock<IUserStore<User>>();
            _userManagerMock = new Mock<UserManager<User>>(store.Object, null, null, null, null, null, null, null, null);

            _dashboardController = new DashboardController(_context, _widgetServiceMock.Object, _userManagerMock.Object);

            // Mock User context
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _dashboardController.ControllerContext = new ControllerContext
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
        public async Task GetWidgetTemplates_ReturnsProperContext()
        {
            // Arrange
            var projectId = 1;
            
            // Seed project context data
            var taskType = new TaskType { Id = 1, ProjectId = projectId, Name = "Bug", Icon = "bug" };
            _context.TaskTypes.Add(taskType);
            _context.TaskFields.Add(new TaskField { Id = 1, Name = "Severity", Type = FieldType.Select, TaskType = taskType });
            _context.UserTaskStatuses.Add(new UserTaskStatus { Id = 1, ProjectId = projectId, Name = "Open", Order = 1 });
            _context.ProjectRoles.Add(new ProjectRole { Id = 1, ProjectId = projectId, RoleName = "Developer" });
            _context.WidgetTemplates.Add(new WidgetTemplate { Id = 1, Name = "My Template", Category = "Tasks", QueryJson = "some source" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _dashboardController.GetWidgetTemplates(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            // Checking basic Ok result presence
            Assert.That(result.Value, Is.Not.Null);
        }

        [Test]
        public async Task GetWidgets_ReturnsUserWidgets()
        {
            // Arrange
            var projectId = 1;
            var widget = new DashboardWidget { Id = 1, UserId = "user1", ProjectId = projectId, Name = "Widget1" };
            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();

            _widgetServiceMock.Setup(x => x.ExecuteQueryAsync(It.IsAny<DashboardWidget>()))
                .ReturnsAsync(new WidgetResult { ResultType = "tasks", Data = new List<object>() });

            // Act
            var result = await _dashboardController.GetWidgets(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var resultsList = result.Value as List<object>;
            Assert.That(resultsList, Is.Not.Null);
            Assert.That(resultsList.Count, Is.EqualTo(1));
        }

        [Test]
        public async Task GetWidgets_WhenWidgetQueryFails_ReturnsWidgetWithError()
        {
            // Arrange
            var projectId = 1;
            var widget = new DashboardWidget { Id = 1, UserId = "user1", ProjectId = projectId, Name = "Widget1" };
            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();

            _widgetServiceMock.Setup(x => x.ExecuteQueryAsync(It.IsAny<DashboardWidget>()))
                .ThrowsAsync(new Exception("Query error"));

            // Act
            var result = await _dashboardController.GetWidgets(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var resultsList = result.Value as List<object>;
            Assert.That(resultsList, Is.Not.Null);
            Assert.That(resultsList.Count, Is.EqualTo(1));
        }

        [Test]
        public async Task CreateWidget_AddsWidgetAndReturnsIt()
        {
            // Arrange
            var projectId = 1;
            var dto = new DashboardController.CreateWidgetDto { Name = "New Widget", Source = "source", Type = WidgetType.ListResult };

            // Act
            var result = await _dashboardController.CreateWidget(projectId, dto) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var returnWidget = result.Value as DashboardWidget;
            Assert.That(returnWidget, Is.Not.Null);
            Assert.That(returnWidget.Name, Is.EqualTo(dto.Name));
            Assert.That(returnWidget.UserId, Is.EqualTo("user1"));
            
            var dbWidget = await _context.DashboardWidgets.FirstOrDefaultAsync();
            Assert.That(dbWidget, Is.Not.Null);
        }

        [Test]
        public async Task UpdateWidget_WithValidData_UpdatesWidget()
        {
             // Arrange
            var projectId = 1;
            var widget = new DashboardWidget { Id = 1, UserId = "user1", ProjectId = projectId, Name = "Widget1" };
            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();
            
            _context.Entry(widget).State = EntityState.Detached; // Detach so we can update in controller using tracked entity again

            var dto = new DashboardController.CreateWidgetDto { Name = "Updated Widget", Source = "new source", Type = WidgetType.Counter };

            // Act
            var result = await _dashboardController.UpdateWidget(projectId, widget.Id, dto) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var returnWidget = result.Value as DashboardWidget;
            Assert.That(returnWidget, Is.Not.Null);
            Assert.That(returnWidget.Name, Is.EqualTo("Updated Widget"));

            var dbWidget = await _context.DashboardWidgets.FindAsync(widget.Id);
            Assert.That(dbWidget.Name, Is.EqualTo("Updated Widget"));
        }

        [Test]
        public async Task UpdateWidget_ForNonExisting_ReturnsNotFound()
        {
             // Arrange
            var dto = new DashboardController.CreateWidgetDto { Name = "Updated Widget" };

            // Act
            var result = await _dashboardController.UpdateWidget(1, 999, dto);

            // Assert
            Assert.That(result, Is.InstanceOf<NotFoundResult>());
        }

        [Test]
        public async Task DeleteWidget_WithValidId_RemovesWidget()
        {
            // Arrange
            var projectId = 1;
            var widget = new DashboardWidget { Id = 1, UserId = "user1", ProjectId = projectId, Name = "Widget1" };
            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();

            // Act
            var result = await _dashboardController.DeleteWidget(projectId, widget.Id) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbWidget = await _context.DashboardWidgets.FindAsync(widget.Id);
            Assert.That(dbWidget, Is.Null);
        }
    }
}
