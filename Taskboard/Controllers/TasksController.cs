using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;

namespace Taskboard.Controllers
{
    [Authorize]
    [Route("api/projects/{projectId}/tasks")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProjectTasks(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess)
            {
                return Forbid();
            }

            var tasks = await _context.Tasks
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.FieldValues)
                    .ThenInclude(fv => fv.TaskField)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Status,
                    t.Completed,
                    t.TaskTypeId,
                    FieldValues = t.FieldValues.Select(fv => new
                    {
                        fv.Id,
                        fv.TaskFieldId,
                        //FieldName = fv.TaskField!.Name,
                        fv.Value
                    }).ToList()
                })
                .ToListAsync();

            return Ok(tasks);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTask(int projectId, [FromBody] CreateTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess)
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { success = false, message = "Task title is required." });
            }

            var task = new TaskItem
            {
                Title = request.Title.Trim(),
                ProjectId = projectId,
                Status = request.Status ?? "To Do",
                Completed = false,
                TaskTypeId = request.TaskTypeId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // If task has a type, create field values with default values
            if (request.TaskTypeId.HasValue)
            {
                var taskFields = await _context.TaskFields
                    .Where(tf => tf.TaskTypeId == request.TaskTypeId.Value)
                    .ToListAsync();

                foreach (var field in taskFields)
                {
                    var fieldValue = new TaskFieldValue
                    {
                        TaskId = task.Id,
                        TaskFieldId = field.Id,
                        Value = field.DefaultValue
                    };
                    _context.TaskFieldValues.Add(fieldValue);
                }

                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                task = new
                {
                    task.Id,
                    task.Title,
                    task.Status,
                    task.Completed,
                    task.TaskTypeId,
                    FieldValues = new List<object>()
                }
            });
        }

        [HttpGet("project-info")]
        public async Task<IActionResult> GetProjectInfo(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess)
            {
                return Forbid();
            }

            var project = await _context.Projects
                .Where(p => p.Id == projectId)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.WorkspaceId
                })
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound(new { success = false, message = "Project not found." });
            }

            return Ok(project);
        }

        [HttpPatch("{taskId}")]
        public async Task<IActionResult> UpdateTaskStatus(int projectId, int taskId, [FromBody] UpdateTaskStatusRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess)
            {
                return Forbid();
            }

            var task = await _context.Tasks
                .Include(t => t.FieldValues)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);

            if (task == null)
            {
                return NotFound(new { success = false, message = "Task not found." });
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                task.Status = request.Status;
            }

            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                task.Title = request.Title;
            }

            if (request.Completed.HasValue)
            {
                task.Completed = request.Completed.Value;
            }

            // Update field values if provided
            if (request.FieldValues != null && request.FieldValues.Count > 0)
            {
                foreach (var fieldReq in request.FieldValues)
                {
                    var fieldValue = task.FieldValues.FirstOrDefault(fv => fv.Id == fieldReq.Id);

                    if (fieldValue != null)
                    {
                        fieldValue.Value = fieldReq.Value;
                    }
                    else
                    {
                        var newFieldValue = new TaskFieldValue
                        {
                            TaskId = task.Id,
                            TaskFieldId = fieldReq.TaskFieldId,
                            Value = fieldReq.Value
                        };
                        _context.TaskFieldValues.Add(newFieldValue);
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                task = new
                {
                    task.Id,
                    task.Title,
                    task.Status,
                    task.Completed,
                    task.TaskTypeId
                }
            });
        }
    }

    public class CreateTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Status { get; set; }
        public int? TaskTypeId { get; set; }
    }

    public class UpdateTaskStatusRequest
    {
        public string? Status { get; set; }
        public string? Title { get; set; }
        public bool? Completed { get; set; }
        public List<FieldValueRequest>? FieldValues { get; set; }
    }

    public class FieldValueRequest
    {
        public int? Id { get; set; }
        public int TaskFieldId { get; set; }
        public string Value { get; set; }
    }
}
