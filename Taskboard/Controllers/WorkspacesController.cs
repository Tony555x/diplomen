using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WorkspacesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;

        public WorkspacesController(AppDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetWorkspace(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Check if user is an active member of this workspace
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == id && wm.UserId == userId && wm.Status == "Active");

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

            // Check if user is an active member of this workspace
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == id && wm.UserId == userId && wm.Status == "Active");

            if (!isMember)
            {
                return Forbid();
            }

            var projects = await _context.Projects
                .Where(p => p.WorkspaceId == id && 
                           (p.AccessLevel == ProjectAccessLevel.Public || 
                            p.AccessLevel == ProjectAccessLevel.Workspace || 
                            p.Members.Any(pm => pm.UserId == userId && pm.Status == ProjectMemberStatus.Active)))
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

        [HttpPost("{id}/visit")]
        public async Task<IActionResult> VisitWorkspace(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);

            if (membership == null) return Forbid();

            membership.LastVisitedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // GET members (active only)
        [HttpGet("{id}/members")]
        public async Task<IActionResult> GetMembers(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId && wm.Status == "Active");
            if (membership == null) return Forbid();

            var members = await _context.WorkspaceMembers
                .Where(wm => wm.WorkspaceId == id && wm.Status == "Active")
                .Include(wm => wm.User)
                .Select(wm => new
                {
                    wm.UserId,
                    UserName = wm.User != null ? wm.User.UserName : wm.UserId,
                    Email = wm.User != null ? wm.User.Email : "",
                    AvatarColor = wm.User != null ? wm.User.AvatarColor : "",
                    wm.Role,
                    wm.JoinedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                members,
                currentUserRole = membership.Role
            });
        }

        // POST invite member by email (sends notification, creates pending record)
        [HttpPost("{id}/members")]
        public async Task<IActionResult> InviteMember(int id, [FromBody] AddWorkspaceMemberRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId && wm.Status == "Active");
            if (membership == null || membership.Role != "Owner")
                return Forbid();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
                return BadRequest(new { success = false, message = "User not found." });

            var already = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == id && wm.UserId == user.Id);
            if (already)
                return BadRequest(new { success = false, message = "User is already a member or has a pending invite." });

            // Create pending membership
            _context.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = id,
                UserId = user.Id,
                Role = "Member",
                Status = "Pending",
                JoinedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Send notification
            var workspace = await _context.Workspaces.FindAsync(id);
            var inviter = await _context.Users.FindAsync(userId);
            if (workspace != null && inviter != null)
            {
                await _notificationService.SendWorkspaceInviteAsync(workspace, inviter, user);
            }

            return Ok(new { success = true, message = "Invitation sent." });
        }

        // POST accept workspace invite
        [HttpPost("{id}/accept-invite")]
        public async Task<IActionResult> AcceptInvite(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var member = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);

            if (member == null) return NotFound(new { success = false, message = "Invitation not found." });
            if (member.Status == "Active")
                return BadRequest(new { success = false, message = "You are already an active member." });

            member.Status = "Active";
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // DELETE remove member
        [HttpDelete("{id}/members/{targetUserId}")]
        public async Task<IActionResult> RemoveMember(int id, string targetUserId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var requesterMembership = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);
            if (requesterMembership == null || requesterMembership.Role != "Owner")
                return Forbid();

            var target = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == targetUserId);
            if (target == null)
                return NotFound(new { success = false, message = "Member not found." });
            if (target.Role == "Owner")
                return BadRequest(new { success = false, message = "Cannot remove the Owner." });

            _context.WorkspaceMembers.Remove(target);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // POST leave workspace
        [HttpPost("{id}/leave")]
        public async Task<IActionResult> LeaveWorkspace(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);
            if (membership == null) return Forbid();
            if (membership.Role == "Owner")
                return BadRequest(new { success = false, message = "Owner cannot leave. Delete the workspace instead." });

            _context.WorkspaceMembers.Remove(membership);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // DELETE delete workspace (owner only)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorkspace(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.WorkspaceMembers
                .FirstOrDefaultAsync(wm => wm.WorkspaceId == id && wm.UserId == userId);
            if (membership == null || membership.Role != "Owner")
                return Forbid();

            var workspace = await _context.Workspaces.FindAsync(id);
            if (workspace == null) return NotFound();

            _context.Workspaces.Remove(workspace);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
    }

    public class CreateWorkspaceRequest
    {
        public string Name { get; set; } = string.Empty;
    }

    public class AddWorkspaceMemberRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
