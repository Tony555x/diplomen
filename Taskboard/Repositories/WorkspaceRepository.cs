using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Taskboard.Repositories
{
    public interface IWorkspaceRepository
    {
        Task DeleteWorkspaceAsync(int workspaceId, bool saveChanges = true);
    }

    public class WorkspaceRepository : IWorkspaceRepository
    {
        private readonly AppDbContext _context;
        private readonly IProjectRepository _projectRepository;

        public WorkspaceRepository(AppDbContext context, IProjectRepository projectRepository)
        {
            _context = context;
            _projectRepository = projectRepository;
        }

        public async Task DeleteWorkspaceAsync(int workspaceId, bool saveChanges = true)
        {
            var workspace = await _context.Workspaces.FindAsync(workspaceId);
            if (workspace == null) return;

            // 1. Delete all projects in the workspace
            var projectIds = await _context.Projects
                .Where(p => p.WorkspaceId == workspaceId)
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var projectId in projectIds)
            {
                await _projectRepository.DeleteProjectAsync(projectId, false);
            }

            // 2. Delete workspace members
            var members = await _context.WorkspaceMembers.Where(wm => wm.WorkspaceId == workspaceId).ToListAsync();
            _context.WorkspaceMembers.RemoveRange(members);

            _context.Workspaces.Remove(workspace);

            if (saveChanges)
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}
