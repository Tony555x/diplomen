using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskboard.Contracts.Projects;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Controllers.Projects;

[Authorize]
[Route("api/projects/{projectId}/members")]
[ApiController]
public class ProjectMembersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IProjectAccessService _projectAccessService;

    public ProjectMembersController(AppDbContext context, INotificationService notificationService, IProjectAccessService projectAccessService)
    {
        _context = context;
        _notificationService = notificationService;
        _projectAccessService = projectAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProjectMembersAndRoles(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        // Allow access via project access level (Public/Workspace)
        if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
            return Forbid();

        var currentUserMembership = await _projectAccessService.GetMembershipAsync(projectId, userId);

        var members = await _context.ProjectMembers
            .Where(pm => pm.ProjectId == projectId)
            .Include(pm => pm.User)
            .Include(pm => pm.ProjectRole)
            .Select(pm => new
            {
                pm.UserId,
                pm.User!.Email,
                pm.User.UserName,
                pm.User.AvatarColor,
                Role = pm.ProjectRole!.RoleName,
                pm.JoinedAt,
                Status = pm.Status.ToString()
            })
            .OrderBy(m => m.JoinedAt)
            .ToListAsync();

        var roles = await _context.ProjectRoles
            .Where(pr => pr.ProjectId == projectId)
            .Select(pr => new
            {
                pr.Id,
                pr.RoleName,
                pr.CanAddEditMembers,
                pr.CanEditProjectSettings,
                pr.CanCreateEditDeleteTasks,
                pr.CanCreateDeleteTaskStatuses,
                pr.IsOwner,
                MemberCount = pr.Members.Count
            })
            .OrderByDescending(r => r.IsOwner)
            .ThenBy(r => r.RoleName)
            .ToListAsync();

        // Guest access (via Public/Workspace access level, not an explicit member)
        object currentUserRole;
        if (currentUserMembership == null)
        {
            currentUserRole = new
            {
                RoleName = "Guest",
                CanAddEditMembers = false,
                CanEditProjectSettings = false,
                CanCreateEditDeleteTasks = false,
                CanCreateDeleteTaskStatuses = false,
                IsOwner = false
            };
        }
        else
        {
            currentUserRole = new
            {
                RoleName = currentUserMembership.ProjectRole!.RoleName,
                CanAddEditMembers = currentUserMembership.ProjectRole.CanAddEditMembers,
                CanEditProjectSettings = currentUserMembership.ProjectRole.CanEditProjectSettings,
                CanCreateEditDeleteTasks = currentUserMembership.ProjectRole.CanCreateEditDeleteTasks,
                CanCreateDeleteTaskStatuses = currentUserMembership.ProjectRole.CanCreateDeleteTaskStatuses,
                IsOwner = currentUserMembership.ProjectRole.IsOwner
            };
        }

        return Ok(new
        {
            success = true,
            members,
            roles,
            currentUserRole
        });
    }

    [HttpPost]
    public async Task<IActionResult> AddProjectMember(int projectId, [FromBody] AddMemberRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var currentUserProjectMember = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (currentUserProjectMember?.ProjectRole?.CanAddEditMembers != true) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { success = false, message = "Email is required." });

        if (request.RoleId <= 0)
            return BadRequest(new { success = false, message = "Role is required." });

        var userToAdd = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (userToAdd == null) return NotFound(new { success = false, message = "User with this email not found." });

        var existingMembership = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userToAdd.Id);

        if (existingMembership)
            return BadRequest(new { success = false, message = "User is already a member of this project." });

        var role = await _context.ProjectRoles.FirstOrDefaultAsync(pr => pr.Id == request.RoleId && pr.ProjectId == projectId);
        if (role == null || role.IsOwner)
            return BadRequest(new { success = false, message = role?.IsOwner == true ? "Cannot assign owner role to new members." : "Invalid role selected." });

        var newMember = new ProjectMember
        {
            ProjectId = projectId,
            UserId = userToAdd.Id,
            ProjectRoleId = role.Id,
            JoinedAt = DateTime.UtcNow,
            Status = ProjectMemberStatus.Pending
        };

        _context.ProjectMembers.Add(newMember);
        await _context.SaveChangesAsync();

        var addedMember = await _context.ProjectMembers
            .Where(pm => pm.ProjectId == projectId && pm.UserId == userToAdd.Id)
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync();

        // Send notification
        var project = await _context.Projects.FindAsync(projectId);
        var inviter = await _context.Users.FindAsync(userId);
        
        if (project != null && inviter != null)
        {
            await _notificationService.SendProjectInviteAsync(project, inviter, new List<User> { userToAdd });
        }

        return Ok(new
        {
            success = true,
            message = "Member invited successfully.",
            member = new
            {
                UserId = userToAdd.Id,
                userToAdd.Email,
                userToAdd.UserName,
                Role = addedMember!.ProjectRole!.RoleName,
                addedMember.JoinedAt,
                Status = addedMember.Status
            }
        });
    }

    [HttpPost("accept-invite")]
    public async Task<IActionResult> AcceptInvite(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var member = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (member == null) return NotFound(new { success = false, message = "Invitation not found." });

        if (member.Status == ProjectMemberStatus.Active)
        {
            return BadRequest(new { success = false, message = "You are already an active member of this project." });
        }

        member.Status = ProjectMemberStatus.Active;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Invitation accepted." });
    }

    [HttpPatch("{userId}")]
    public async Task<IActionResult> UpdateProjectMember(int projectId, string userId, [FromBody] UpdateMemberRequest request)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null) return Unauthorized();

        var currentMember = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == currentUserId && pm.Status == ProjectMemberStatus.Active);

        if (currentMember?.ProjectRole?.CanAddEditMembers != true) return Forbid();

        var memberToUpdate = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .Include(pm => pm.User)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (memberToUpdate == null) return NotFound(new { success = false, message = "Member not found." });
        if (memberToUpdate.ProjectRole?.IsOwner == true) return BadRequest(new { success = false, message = "Cannot modify the owner's role." });

        var newRole = await _context.ProjectRoles.FirstOrDefaultAsync(pr => pr.Id == request.RoleId && pr.ProjectId == projectId);
        if (newRole == null || newRole.IsOwner) return BadRequest(new { success = false, message = "Cannot assign owner role to members." });

        memberToUpdate.ProjectRoleId = newRole.Id;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Member role updated successfully.",
            member = new
            {
                UserId = memberToUpdate.UserId,
                memberToUpdate.User!.Email,
                memberToUpdate.User.UserName,
                Role = newRole.RoleName,
                memberToUpdate.JoinedAt
            }
        });
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> DeleteProjectMember(int projectId, string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null) return Unauthorized();

        var currentMember = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == currentUserId && pm.Status == ProjectMemberStatus.Active);

        if (currentMember?.ProjectRole?.CanAddEditMembers != true) return Forbid();

        var memberToDelete = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (memberToDelete == null) return NotFound(new { success = false, message = "Member not found." });
        if (memberToDelete.ProjectRole?.IsOwner == true) return BadRequest(new { success = false, message = "Cannot remove the project owner." });

        _context.ProjectMembers.Remove(memberToDelete);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Member removed successfully." });
    }

    [HttpGet("{userId}/activity")]
    public async Task<IActionResult> GetMemberActivity(int projectId, string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null) return Unauthorized();

        if (!await _projectAccessService.HasViewAccessAsync(projectId, currentUserId))
            return Forbid();

        var projectName = await _context.Projects
            .Where(p => p.Id == projectId)
            .Select(p => p.Name)
            .FirstOrDefaultAsync();

        var activity = await _context.TaskHistories
            .Where(h => h.UserId == userId && h.Task != null && h.Task.ProjectId == projectId)
            .Include(h => h.Task)
            .Include(h => h.User)
            .OrderByDescending(h => h.CreatedAt)
            .Select(h => new
            {
                h.Id,
                h.ActionType,
                h.Details,
                h.CreatedAt,
                TaskId = h.TaskId,
                TaskTitle = h.Task != null ? h.Task.Title : null,
                UserName = h.User != null ? h.User.UserName : null
            })
            .Take(100)
            .ToListAsync();

        return Ok(new { success = true, projectName, activity });
    }
}
