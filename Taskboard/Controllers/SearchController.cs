using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;

namespace Taskboard.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SearchController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(q))
                return Ok(new { tasks = new List<object>(), projects = new List<object>(), workspaces = new List<object>() });

            var query = q.Trim().ToLower();

            // Workspaces the user is an active member of
            var workspaceIds = await _context.WorkspaceMembers
                .Where(wm => wm.UserId == userId && wm.Status == "Active")
                .Select(wm => wm.WorkspaceId)
                .ToListAsync();

            var workspaces = await _context.Workspaces
                .Where(w => workspaceIds.Contains(w.Id) && w.Name.ToLower().Contains(query))
                .Select(w => new { w.Id, w.Name })
                .Take(5)
                .ToListAsync();

            // Projects the user is an active member of
            var projectIds = await _context.ProjectMembers
                .Where(pm => pm.UserId == userId && pm.Status == ProjectMemberStatus.Active)
                .Select(pm => pm.ProjectId)
                .ToListAsync();

            var projects = await _context.Projects
                .Where(p => projectIds.Contains(p.Id) && p.Name.ToLower().Contains(query))
                .Select(p => new { p.Id, p.Name, p.WorkspaceId })
                .Take(5)
                .ToListAsync();

            // Tasks within those projects
            var tasks = await _context.Tasks
                .Where(t => projectIds.Contains(t.ProjectId) && t.Title.ToLower().Contains(query))
                .Include(t => t.TaskType)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.ProjectId,
                    t.Completed,
                    TaskTypeIcon = t.TaskType != null ? t.TaskType.Icon : null
                })
                .Take(8)
                .ToListAsync();

            return Ok(new
            {
                tasks = tasks.Cast<object>().ToList(),
                projects = projects.Cast<object>().ToList(),
                workspaces = workspaces.Cast<object>().ToList()
            });
        }
    }
}
