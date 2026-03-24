using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Taskboard.Repositories
{
    public interface IProjectRepository
    {
        Task DeleteProjectAsync(int projectId, bool saveChanges = true);
    }

    public class ProjectRepository : IProjectRepository
    {
        private readonly AppDbContext _context;
        private readonly ITaskRepository _taskRepository;

        public ProjectRepository(AppDbContext context, ITaskRepository taskRepository)
        {
            _context = context;
            _taskRepository = taskRepository;
        }

        public async Task DeleteProjectAsync(int projectId, bool saveChanges = true)
        {
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null) return;

            // 1. Delete all tasks in the project
            var topLevelTaskIds = await _context.Tasks
                .Where(t => t.ProjectId == projectId && t.ParentTaskId == null)
                .Select(t => t.Id)
                .ToListAsync();

            if (topLevelTaskIds.Any())
            {
                await _taskRepository.DeleteTasksBulkAsync(topLevelTaskIds, false);
            }

            // 2. Delete project-level entities that don't cascade or need explicit ordering
            var collections = await _context.Collections.Where(c => c.ProjectId == projectId).ToListAsync();
            _context.Collections.RemoveRange(collections);

            var members = await _context.ProjectMembers.Where(pm => pm.ProjectId == projectId).ToListAsync();
            _context.ProjectMembers.RemoveRange(members);

            var roles = await _context.ProjectRoles.Where(pr => pr.ProjectId == projectId).ToListAsync();
            _context.ProjectRoles.RemoveRange(roles);

            var taskTypes = await _context.TaskTypes.Where(tt => tt.ProjectId == projectId).ToListAsync();
            _context.TaskTypes.RemoveRange(taskTypes);

            var statuses = await _context.UserTaskStatuses.Where(ts => ts.ProjectId == projectId).ToListAsync();
            _context.UserTaskStatuses.RemoveRange(statuses);

            var widgets = await _context.DashboardWidgets.Where(dw => dw.ProjectId == projectId).ToListAsync();
            _context.DashboardWidgets.RemoveRange(widgets);

            _context.Projects.Remove(project);

            if (saveChanges)
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}
