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
