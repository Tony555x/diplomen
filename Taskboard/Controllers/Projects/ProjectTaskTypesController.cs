using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskboard.Contracts.Projects;
using Taskboard.Data.Models;

namespace Taskboard.Controllers.Projects;

[Authorize]
[Route("api/projects/{projectId}/task-types")]
[ApiController]
public class ProjectTaskTypesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProjectTaskTypesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetProjectTaskTypes(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var hasAccess = await _context.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
        if (!hasAccess) return Forbid();

        var taskTypes = await _context.TaskTypes
            .Where(tt => tt.ProjectId == projectId)
            .Include(tt => tt.Fields)
            .Select(tt => new
            {
                tt.Id,
                tt.Name,
                tt.Description,
                tt.Icon,
                Fields = tt.Fields.OrderBy(f => f.Order).Select(f => new
                {
                    f.Id,
                    f.Name,
                    f.Description,
                    Type = f.Type.ToString(),
                    f.IsRequired,
                    f.Options,
                    f.DefaultValue,
                    f.Order
                }).ToList()
            })
            .ToListAsync();

        return Ok(new { success = true, taskTypes });
    }

    [HttpPut]
    [HttpPost]
    public async Task<IActionResult> UpsertTaskType(int projectId, [FromBody] UpsertTaskTypeRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanEditProjectSettings)
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Task type name is required." });

        TaskType? taskType;

        if (request.Id.HasValue)
        {
            taskType = await _context.TaskTypes.Include(tt => tt.Fields)
                .FirstOrDefaultAsync(tt => tt.Id == request.Id.Value && tt.ProjectId == projectId);
            if (taskType == null) return NotFound();
        }
        else
        {
            taskType = new TaskType { ProjectId = projectId };
            _context.TaskTypes.Add(taskType);
        }

        taskType.Name = request.Name.Trim();
        taskType.Description = request.Description;
        taskType.Icon = request.Icon;

        await _context.SaveChangesAsync();

        var existingFields = taskType.Fields.ToList();
        var incomingIds = request.Fields.Where(f => f.Id.HasValue).Select(f => f.Id!.Value).ToHashSet();
        var fieldsToDelete = existingFields.Where(f => !incomingIds.Contains(f.Id)).ToList();
        if (fieldsToDelete.Count > 0) _context.TaskFields.RemoveRange(fieldsToDelete);

        foreach (var fieldRequest in request.Fields.Where(f => f.Id.HasValue))
        {
            var field = existingFields.First(f => f.Id == fieldRequest.Id);
            field.Name = fieldRequest.Name.Trim();
            field.Type = fieldRequest.Type;
            field.IsRequired = fieldRequest.IsRequired;
            field.Options = fieldRequest.Options;
            field.DefaultValue = fieldRequest.DefaultValue;
            field.Order = fieldRequest.Order;
        }

        var newFields = request.Fields.Where(f => !f.Id.HasValue)
            .Select(f => new TaskField
            {
                TaskTypeId = taskType.Id,
                Name = f.Name.Trim(),
                Type = f.Type,
                IsRequired = f.IsRequired,
                Options = f.Options,
                DefaultValue = f.DefaultValue,
                Order = f.Order
            });

        _context.TaskFields.AddRange(newFields);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, taskTypeId = taskType.Id });
    }

    [HttpDelete("{taskTypeId}")]
    public async Task<IActionResult> DeleteTaskType(int projectId, int taskTypeId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var membership = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (membership == null || membership.ProjectRole == null || !membership.ProjectRole.CanEditProjectSettings)
            return Forbid();

        var taskType = await _context.TaskTypes.FirstOrDefaultAsync(tt => tt.Id == taskTypeId && tt.ProjectId == projectId);
        if (taskType == null) return NotFound(new { success = false, message = "Task type not found." });

        var isInUse = await _context.Tasks.AnyAsync(t => t.TaskTypeId == taskTypeId);
        if (isInUse) return BadRequest(new { success = false, message = "Cannot delete task type that is currently in use by tasks." });

        _context.TaskTypes.Remove(taskType);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Task type deleted successfully." });
    }
}