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
    public class WorkspacesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public WorkspacesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetWorkspace(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Check if user is a member of this workspace
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);

            if (!isMember)
            {
                return Forbid();
            }

            var workspace = await _context.Workspaces
                .Where(w => w.Id == id)
                .Select(w => new
                {
                    w.Id,
                    w.Name
                })
                .FirstOrDefaultAsync();

            if (workspace == null)
            {
                return NotFound(new { success = false, message = "Workspace not found." });
            }

            return Ok(workspace);
        }

        [HttpGet("{id}/projects")]
        public async Task<IActionResult> GetWorkspaceProjects(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Check if user is a member of this workspace
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);

            if (!isMember)
            {
                return Forbid();
            }

            var projects = await _context.Projects
                .Where(p => p.WorkspaceId == id)
                .Select(p => new
                {
                    p.Id,
                    p.Name
                })
                .ToListAsync();

            return Ok(projects);
        }

        [HttpPost]
        public async Task<IActionResult> CreateWorkspace([FromBody] CreateWorkspaceRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { success = false, message = "Workspace name is required." });
            }

            // Create workspace
            var workspace = new Workspace
            {
                Name = request.Name.Trim()
            };

            _context.Workspaces.Add(workspace);
            await _context.SaveChangesAsync();

            // Add creator as owner
            var workspaceMember = new WorkspaceMember
            {
                WorkspaceId = workspace.Id,
                UserId = userId,
                Role = "Owner",
                JoinedAt = DateTime.UtcNow
            };

            _context.WorkspaceMembers.Add(workspaceMember);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Workspace created successfully.",
                workspace = new
                {
                    workspace.Id,
                    workspace.Name
                }
            });
        }
    }

    public class CreateWorkspaceRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}
