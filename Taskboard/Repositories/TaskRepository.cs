using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Taskboard.Data.Models;

namespace Taskboard.Repositories
{
    public interface ITaskRepository
    {
        Task DeleteTaskAsync(int taskId, bool saveChanges = true);
        Task DeleteTasksBulkAsync(IEnumerable<int> taskIds, bool saveChanges = true);
    }

    public class TaskRepository : ITaskRepository
    {
        private readonly AppDbContext _context;

        public TaskRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task DeleteTaskAsync(int taskId, bool saveChanges = true)
        {
            await DeleteTasksBulkAsync(new[] { taskId }, saveChanges);
        }

        public async Task DeleteTasksBulkAsync(IEnumerable<int> taskIds, bool saveChanges = true)
        {
            if (!taskIds.Any()) return;

            var allTaskIds = taskIds.ToList();

            // Find all subtasks for these tasks recursively or just 1 level deep
            // Assuming max 1 level of subtasks based on current parent logic
            var subtaskIds = await _context.Tasks
                .Where(t => t.ParentTaskId.HasValue && allTaskIds.Contains(t.ParentTaskId.Value))
                .Select(t => t.Id)
                .ToListAsync();

            allTaskIds.AddRange(subtaskIds);
            allTaskIds = allTaskIds.Distinct().ToList();

            if (!allTaskIds.Any()) return;

            // Delete FieldValues
            var fieldValues = await _context.TaskFieldValues
                .Where(fv => allTaskIds.Contains(fv.TaskId))
                .ToListAsync();
            _context.TaskFieldValues.RemoveRange(fieldValues);

            // Delete Blockers
            var blockers = await _context.TaskBlockers
                .Where(tb => allTaskIds.Contains(tb.BlockingTaskId) || allTaskIds.Contains(tb.BlockedTaskId))
                .ToListAsync();
            _context.TaskBlockers.RemoveRange(blockers);

            // Delete UserTasks
            var userTasks = await _context.UserTasks
                .Where(ut => allTaskIds.Contains(ut.TaskItemId))
                .ToListAsync();
            _context.UserTasks.RemoveRange(userTasks);

            // The tasks themselves
            var tasks = await _context.Tasks
                .Where(t => allTaskIds.Contains(t.Id))
                .ToListAsync();
            _context.Tasks.RemoveRange(tasks);

            if (saveChanges)
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}
