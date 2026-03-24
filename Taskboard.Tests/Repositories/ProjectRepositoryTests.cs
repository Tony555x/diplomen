using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using NUnit.Framework;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Repositories;

namespace Taskboard.Tests.Repositories
{
    [TestFixture]
    public class ProjectRepositoryTests
    {
        private AppDbContext _context;
        private Mock<ITaskRepository> _taskRepositoryMock;
        private ProjectRepository _projectRepository;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _taskRepositoryMock = new Mock<ITaskRepository>();
            _projectRepository = new ProjectRepository(_context, _taskRepositoryMock.Object);
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task DeleteProjectAsync_CascadesDependenciesAndCallsTaskRepo()
        {
            var projectId = 1;
            _context.Projects.Add(new Project { Id = projectId, Name = "Test Project" });
            
            _context.Tasks.Add(new TaskItem { Id = 10, ProjectId = projectId, Title = "Task1" }); // Top level
            _context.Tasks.Add(new TaskItem { Id = 11, ProjectId = projectId, ParentTaskId = 10, Title = "Subtask1" }); // Should be ignored in bulk list as it's subtask
            
            _context.Collections.Add(new Collection { Id = 1, ProjectId = projectId, Name = "Backlog" });
            _context.UserTaskStatuses.Add(new UserTaskStatus { Id = 1, ProjectId = projectId, Name = "To Do" });
            _context.ProjectRoles.Add(new ProjectRole { Id = 1, ProjectId = projectId, RoleName = "Owner" });
            
            await _context.SaveChangesAsync();

            await _projectRepository.DeleteProjectAsync(projectId, true);

            // Verify bulk task deletion is called for top-level tasks only (Id=10), passing saveChanges=false
            _taskRepositoryMock.Verify(x => x.DeleteTasksBulkAsync(It.Is<System.Collections.Generic.IEnumerable<int>>(ids => ids.Contains(10) && !ids.Contains(11)), false), Times.Once);

            var dbProject = await _context.Projects.FindAsync(projectId);
            Assert.That(dbProject, Is.Null);
            
            Assert.That(await _context.Collections.AnyAsync(), Is.False);
            Assert.That(await _context.UserTaskStatuses.AnyAsync(), Is.False);
            Assert.That(await _context.ProjectRoles.AnyAsync(), Is.False);
        }
    }
}
