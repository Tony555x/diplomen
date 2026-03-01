using Microsoft.EntityFrameworkCore;
using Taskboard.Data.Models;

namespace Taskboard.Services
{
    public class ProjectAccessService : IProjectAccessService
    {
        private readonly AppDbContext _context;

        public ProjectAccessService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> HasViewAccessAsync(int projectId, string userId)
        {
            var project = await _context.Projects
                .AsNoTracking()
                .Select(p => new { p.Id, p.AccessLevel, p.WorkspaceId })
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return false;

            // Public: any authenticated user can view
            if (project.AccessLevel == ProjectAccessLevel.Public)
                return true;

            // Workspace: any active workspace member can view
            if (project.AccessLevel == ProjectAccessLevel.Workspace)
            {
                var isWorkspaceMember = await _context.WorkspaceMembers
                    .AnyAsync(wm => wm.WorkspaceId == project.WorkspaceId && wm.UserId == userId);
                if (isWorkspaceMember) return true;
            }

            // Private (or Workspace fallback): must be an active project member
            return await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
        }

        public async Task<ProjectMember?> GetMembershipAsync(int projectId, string userId)
        {
            return await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
        }
    }
}
