using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;

namespace Taskboard.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class HomeController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HomeController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("data")]
        public async Task<IActionResult> GetHomeData()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // All Workspaces ordered by last visited (or joined if never visited)
            var recentWorkspaces = await _context.WorkspaceMembers
                .Where(wm => wm.UserId == userId)
                .Include(wm => wm.Workspace)
                .OrderByDescending(wm => wm.LastVisitedAt ?? wm.JoinedAt)
                .Select(wm => new
                {
                    wm.Workspace.Id,
                    wm.Workspace.Name,
                    LastVisitedAt = wm.LastVisitedAt
                })
                .ToListAsync();

            // All Projects ordered by last visited (or joined if never visited)
            var recentProjects = await _context.ProjectMembers
                .Where(pm => pm.UserId == userId && pm.Status == ProjectMemberStatus.Active)
                .Include(pm => pm.Project)
                .OrderByDescending(pm => pm.LastVisitedAt ?? pm.JoinedAt)
                .Select(pm => new
                {
                    pm.Project.Id,
                    pm.Project.Name,
                    LastVisitedAt = pm.LastVisitedAt
                })
                .ToListAsync();

            // Assigned Tasks (Top 10, not completed)
            var assignedTasks = await _context.Tasks
                .Where(t => !t.Completed && t.UserTasks.Any(ut => ut.UserId == userId))
                .Include(t => t.Project)
                .OrderByDescending(t => t.Id)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    IsCompleted = t.Completed,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "No Project"
                })
                .Take(10)
                .ToListAsync();

            return Ok(new
            {
                Workspaces = recentWorkspaces,
                Projects = recentProjects,
                Tasks = assignedTasks
            });
        }
    }
}
