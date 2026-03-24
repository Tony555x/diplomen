using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Repositories;

namespace Taskboard.Tests.Repositories
{
    [TestFixture]
    public class TaskRepositoryTests
    {
        private AppDbContext _context;
        private TaskRepository _taskRepository;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _taskRepository = new TaskRepository(_context);
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task DeleteTaskAsync_CascadesToSubtasksAndRelatedEntities()
        {
            var taskId = 1;
            var subtaskId = 2;

            _context.Tasks.Add(new TaskItem { Id = taskId, Title = "Parent" });
            _context.Tasks.Add(new TaskItem { Id = subtaskId, ParentTaskId = taskId, Title = "Child" });
            _context.TaskFieldValues.Add(new TaskFieldValue { Id = 1, TaskId = taskId, Value = "Val" });
            _context.TaskFieldValues.Add(new TaskFieldValue { Id = 2, TaskId = subtaskId, Value = "Val2" });
            _context.UserTasks.Add(new UserTask { TaskItemId = subtaskId, UserId = "user1" });
            
            await _context.SaveChangesAsync();

            await _taskRepository.DeleteTaskAsync(taskId, true);

            var dbTask = await _context.Tasks.FindAsync(taskId);
            var dbSubtask = await _context.Tasks.FindAsync(subtaskId);
            var dbFieldValues = await _context.TaskFieldValues.ToListAsync();
            var dbUserTasks = await _context.UserTasks.ToListAsync();

            Assert.That(dbTask, Is.Null);
            Assert.That(dbSubtask, Is.Null);
            Assert.That(dbFieldValues, Is.Empty);
            Assert.That(dbUserTasks, Is.Empty);
        }
    }
}
