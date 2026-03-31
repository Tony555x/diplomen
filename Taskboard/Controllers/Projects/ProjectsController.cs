using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskboard.Data.Models;
using Taskboard.Contracts.Projects;
using Taskboard.Services;
using Taskboard.Repositories;

namespace Taskboard.Controllers.Projects;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IProjectAccessService _projectAccessService;
    private readonly IProjectRepository _projectRepository;

    public ProjectsController(AppDbContext context, INotificationService notificationService, IProjectAccessService projectAccessService, IProjectRepository projectRepository)
    {
        _context = context;
        _notificationService = notificationService;
        _projectAccessService = projectAccessService;
        _projectRepository = projectRepository;
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Project name is required." });

        var isMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == request.WorkspaceId && wm.UserId == userId);

        if (!isMember)
            return Forbid();

        var memberEmails = request.MemberEmails ?? new List<string>();
        var validatedMembers = new List<User>();

        foreach (var email in memberEmails)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                return BadRequest(new { success = false, message = $"User with email '{email}' not found." });

            validatedMembers.Add(user);
        }

        var project = new Project
        {
            Name = request.Name.Trim(),
            WorkspaceId = request.WorkspaceId,
            AccessLevel = request.AccessLevel
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var ownerRole = new ProjectRole
        {
            ProjectId = project.Id,
            RoleName = "Owner",
            CanAddEditMembers = true,
            CanEditProjectSettings = true,
            CanCreateEditDeleteTasks = true,
            CanCreateDeleteTaskStatuses = true,
            IsOwner = true
        };

        var memberRole = new ProjectRole
        {
            ProjectId = project.Id,
            RoleName = "Member",
            CanAddEditMembers = false,
            CanEditProjectSettings = false,
            CanCreateEditDeleteTasks = true,
            CanCreateDeleteTaskStatuses = false,
            IsOwner = false
        };

        _context.ProjectRoles.Add(ownerRole);
        _context.ProjectRoles.Add(memberRole);
        await _context.SaveChangesAsync();

        var creatorMembership = new ProjectMember
        {
            ProjectId = project.Id,
            UserId = userId,
            ProjectRoleId = ownerRole.Id,
            JoinedAt = DateTime.UtcNow
        };

        _context.ProjectMembers.Add(creatorMembership);

        foreach (var member in validatedMembers)
        {
            if (member.Id == userId) continue;

            _context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = project.Id,
                UserId = member.Id,
                ProjectRoleId = memberRole.Id,
                JoinedAt = DateTime.UtcNow,
                Status = ProjectMemberStatus.Pending
            });
        }

        await _context.SaveChangesAsync();

        // Create default statuses
        var defaultStatuses = new List<string> { "To Do", "In Progress", "Done" };
        var defaultColors = new List<string> { "#6B7280", "#3B82F6", "#10B981" };
        for (int i = 0; i < defaultStatuses.Count; i++)
        {
            _context.UserTaskStatuses.Add(new UserTaskStatus
            {
                Name = defaultStatuses[i],
                ProjectId = project.Id,
                Order = i,
                Color = defaultColors[i],
                AutoComplete = defaultStatuses[i] == "Done"
            });
        }
        await _context.SaveChangesAsync();

        // Create default "Task" type
        var defaultTaskType = new TaskType
        {
            Name = "Task",
            ProjectId = project.Id,
            Description = "Default task type",
            Icon = "task.png"
        };
        _context.TaskTypes.Add(defaultTaskType);
        await _context.SaveChangesAsync();

        // Create "Description" field for the default task type
        var descriptionField = new TaskField
        {
            Name = "Description",
            Type = FieldType.Text,
            IsRequired = false,
            Order = 0,
            TaskTypeId = defaultTaskType.Id,
            DefaultValue = ""
        };
        _context.TaskFields.Add(descriptionField);
        await _context.SaveChangesAsync();

        // Send notifications
        var currentUser = await _context.Users.FindAsync(userId);
        if (currentUser != null && validatedMembers.Any())
        {
            await _notificationService.SendProjectInviteAsync(project, currentUser, validatedMembers);
        }

        return Ok(new
        {
            success = true,
            message = "Project created successfully.",
            project = new
            {
                project.Id,
                project.Name,
                project.AccessLevel
            }
        });
    }

    [HttpGet("{projectId}/statuses")]
    public async Task<IActionResult> GetTaskStatuses(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
            return Forbid();

        var statuses = await _context.UserTaskStatuses
            .Where(ts => ts.ProjectId == projectId)
            .OrderBy(ts => ts.Order)
            .ToListAsync();

        return Ok(statuses);
    }

    [HttpPost("{projectId}/statuses")]
    public async Task<IActionResult> CreateTaskStatus(int projectId, [FromBody] CreateUserTaskStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanCreateDeleteTaskStatuses)
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Status name is required." });

        var maxOrder = await _context.UserTaskStatuses
            .Where(ts => ts.ProjectId == projectId)
            .Select(ts => (int?)ts.Order)
            .MaxAsync() ?? -1;

        var status = new UserTaskStatus
        {
            Name = request.Name.Trim(),
            ProjectId = projectId,
            Order = maxOrder + 1,
            Color = request.Color ?? "#3B82F6",
            AutoComplete = request.AutoComplete
        };

        _context.UserTaskStatuses.Add(status);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, status });
    }

    [HttpDelete("{projectId}/statuses/{statusId}")]
    public async Task<IActionResult> DeleteTaskStatus(int projectId, int statusId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanCreateDeleteTaskStatuses)
            return Forbid();

        var status = await _context.UserTaskStatuses.FirstOrDefaultAsync(ts => ts.Id == statusId && ts.ProjectId == projectId);
        if (status == null) return NotFound();

        // Check if any tasks are using this status
        var tasksUsingStatus = await _context.Tasks.AnyAsync(t => t.ProjectId == projectId && !t.IsArchived && t.Status == status.Name);
        if (tasksUsingStatus)
        {
            return BadRequest(new { success = false, message = "Cannot delete status while tasks are using it." });
        }

        _context.UserTaskStatuses.Remove(status);
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    [HttpPatch("{projectId}/statuses/{statusId}")]
    public async Task<IActionResult> UpdateTaskStatus(int projectId, int statusId, [FromBody] UpdateUserTaskStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanCreateDeleteTaskStatuses)
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Status name is required." });

        var newStatusName = request.Name.Trim();

        var status = await _context.UserTaskStatuses.FirstOrDefaultAsync(ts => ts.Id == statusId && ts.ProjectId == projectId);
        if (status == null) return NotFound(new { success = false, message = "Status not found." });

        // Check if another status already exists with this name in the same project to avoid confusion
        var existingStatus = await _context.UserTaskStatuses
            .AnyAsync(ts => ts.ProjectId == projectId && ts.Name == newStatusName && ts.Id != statusId);
        if (existingStatus)
            return BadRequest(new { success = false, message = "A status with this name already exists." });

        var oldStatusName = status.Name;
        status.Name = newStatusName;

        // Update all tasks that currently use the old status name
        var tasksToUpdate = await _context.Tasks
            .Where(t => t.ProjectId == projectId && t.Status == oldStatusName)
            .ToListAsync();

        foreach (var task in tasksToUpdate)
        {
            task.Status = newStatusName;
        }

        if (request.Color != null)
        {
            status.Color = request.Color;
        }
        status.AutoComplete = request.AutoComplete;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, status });
    }

    [HttpPost("{projectId}/statuses/{statusId}/shift")]
    public async Task<IActionResult> ShiftTaskStatus(int projectId, int statusId, [FromQuery] string direction)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanCreateDeleteTaskStatuses)
            return Forbid();

        var statuses = await _context.UserTaskStatuses
            .Where(ts => ts.ProjectId == projectId)
            .OrderBy(ts => ts.Order)
            .ToListAsync();

        var currentIndex = statuses.FindIndex(s => s.Id == statusId);
        if (currentIndex == -1) return NotFound(new { success = false, message = "Status not found." });

        if (direction == "left" && currentIndex > 0)
        {
            // Swap with left
            var leftStatus = statuses[currentIndex - 1];
            var temp = statuses[currentIndex].Order;
            statuses[currentIndex].Order = leftStatus.Order;
            leftStatus.Order = temp;
        }
        else if (direction == "right" && currentIndex < statuses.Count - 1)
        {
            // Swap with right
            var rightStatus = statuses[currentIndex + 1];
            var temp = statuses[currentIndex].Order;
            statuses[currentIndex].Order = rightStatus.Order;
            rightStatus.Order = temp;
        }
        else
        {
            return BadRequest(new { success = false, message = "Cannot shift in that direction." });
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPatch("{projectId}")]
    public async Task<IActionResult> UpdateProject(
        int projectId,
        [FromBody] UpdateProjectRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanEditProjectSettings)
            return Forbid();

        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
        if (project == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Project name is required." });

        project.Name = request.Name.Trim();
        project.AccessLevel = request.AccessLevel;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            project = new
            {
                project.Id,
                project.Name,
                project.AccessLevel
            }
        });
    }

    [HttpPost("validate-email")]
    public async Task<IActionResult> ValidateEmail([FromBody] ValidateEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { success = false, message = "Email is required." });

        var user = await _context.Users
            .Where(u => u.Email == request.Email)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.UserName
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound(new { success = false, message = "User with this email not found." });

        return Ok(new { success = true, user });
    }

    [HttpPost("{projectId}/leave")]
    public async Task<IActionResult> LeaveProject(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null) return NotFound(new { success = false, message = "You are not a member of this project." });
        if (membership.ProjectRole?.IsOwner == true) return BadRequest(new { success = false, message = "The project owner cannot leave. Transfer ownership or delete the project." });

        _context.ProjectMembers.Remove(membership);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "You have left the project." });
    }

    [HttpDelete("{projectId}")]
    public async Task<IActionResult> DeleteProject(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership?.ProjectRole?.IsOwner != true) return Forbid();

        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
        if (project == null) return NotFound(new { success = false, message = "Project not found." });

        await _projectRepository.DeleteProjectAsync(projectId);

        return Ok(new { success = true, message = "Project deleted." });
    }

    [HttpPost("{projectId}/visit")]
    public async Task<IActionResult> VisitProject(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

        if (membership == null) return Forbid();

        membership.LastVisitedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }
}







