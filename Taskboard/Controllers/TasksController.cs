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
                    t.CollectionId,
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

            // If collectionId is provided, verify it exists and belongs to the same project
            if (request.CollectionId.HasValue)
            {
                var collectionExists = await _context.Collections
                    .AnyAsync(c => c.Id == request.CollectionId.Value && c.ProjectId == projectId);

                if (!collectionExists)
                {
                    return BadRequest(new { success = false, message = "Collection not found." });
                }
            }

            var task = new TaskItem
            {
                Title = request.Title.Trim(),
                ProjectId = projectId,
                Status = request.Status ?? "To Do",
                Completed = false,
                TaskTypeId = request.TaskTypeId,
                CollectionId = request.CollectionId
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
                    task.CollectionId,
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
        public async Task<IActionResult> UpdateTask(int projectId, int taskId, [FromBody] UpdateTaskStatusRequest request)
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

            // Update CollectionId if provided
            if (request.CollectionId.HasValue)
            {
                // Verify collection exists and belongs to the same project
                var collectionExists = await _context.Collections
                    .AnyAsync(c => c.Id == request.CollectionId.Value && c.ProjectId == projectId);

                if (!collectionExists)
                {
                    return BadRequest(new { success = false, message = "Collection not found." });
                }

                task.CollectionId = request.CollectionId.Value;
            }
            else if (request.CollectionId == null && request.CollectionId != task.CollectionId)
            {
                // Explicitly set to null if passed as null
                task.CollectionId = null;
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
        [HttpDelete("{taskId}")]
        public async Task<IActionResult> DeleteTask(int projectId, int taskId)
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

            // Remove related field values first (explicit for safety)
            if (task.FieldValues.Any())
            {
                _context.TaskFieldValues.RemoveRange(task.FieldValues);
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                taskId = taskId
            });
        }
        [HttpGet("{taskId}/assignees")]
        public async Task<IActionResult> GetTaskAssignees(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess) return Forbid();

            var assignees = await _context.UserTasks
                .Where(ut => ut.TaskItemId == taskId)
                .Select(ut => new
                {
                    ut.UserId,
                    ut.User!.UserName
                })
                .ToListAsync();

            return Ok(assignees);
        }

        [HttpPost("{taskId}/assignees")]
        public async Task<IActionResult> AssignUserToTask(int projectId, int taskId, [FromBody] AssignUserRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess) return Forbid();

            var alreadyAssigned = await _context.UserTasks
                .AnyAsync(ut => ut.TaskItemId == taskId && ut.UserId == request.UserId);

            if (alreadyAssigned) return Ok();

            var assignment = new UserTask
            {
                TaskItemId = taskId,
                UserId = request.UserId,
                Role = "Assignee"
            };

            _context.UserTasks.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpDelete("{taskId}/assignees/{assignedUserId}")]
        public async Task<IActionResult> RemoveUserFromTask(int projectId, int taskId, string assignedUserId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess) return Forbid();

            var assignment = await _context.UserTasks
                .FirstOrDefaultAsync(ut => ut.TaskItemId == taskId && ut.UserId == assignedUserId);

            if (assignment == null) return NotFound();

            _context.UserTasks.Remove(assignment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
        [HttpGet("{taskId}/due-date")]
        public async Task<IActionResult> GetTaskDueDate(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
            if (!hasAccess) return Forbid();

            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);

            if (task == null) return NotFound(new { success = false, message = "Task not found." });

            return Ok(new { dueDate = task.DueDate });
        }
        [HttpPut("{taskId}/due-date")]
        public async Task<IActionResult> SetTaskDueDate(int projectId, int taskId, [FromBody] SetDueDateRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
            if (!hasAccess) return Forbid();

            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);

            if (task == null) return NotFound(new { success = false, message = "Task not found." });

            task.DueDate = request.DueDate;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, dueDate = task.DueDate });
        }

        [HttpGet("{taskId}/messages")]
        public async Task<IActionResult> GetTaskMessages(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
            if (!hasAccess) return Forbid();

            var messages = await _context.TaskMessages
                .Where(tm => tm.TaskItemId == taskId)
                .OrderBy(tm => tm.CreatedAt)
                .Select(tm => new
                {
                    tm.Id,
                    tm.Content,
                    tm.CreatedAt,
                    tm.UserId,
                    UserName = tm.User!.UserName
                })
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost("{taskId}/messages")]
        public async Task<IActionResult> CreateTaskMessage(int projectId, int taskId, [FromBody] CreateMessageRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
            if (!hasAccess) return Forbid();

            // Verify task exists and belongs to project
            var taskExists = await _context.Tasks
                .AnyAsync(t => t.Id == taskId && t.ProjectId == projectId);
            if (!taskExists) return NotFound(new { success = false, message = "Task not found." });

            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { success = false, message = "Message content is required." });
            }

            var message = new TaskMessage
            {
                TaskItemId = taskId,
                UserId = userId,
                Content = request.Content.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.TaskMessages.Add(message);
            await _context.SaveChangesAsync();

            // Reload with user info
            var createdMessage = await _context.TaskMessages
                .Where(tm => tm.Id == message.Id)
                .Select(tm => new
                {
                    tm.Id,
                    tm.Content,
                    tm.CreatedAt,
                    tm.UserId,
                    UserName = tm.User!.UserName
                })
                .FirstOrDefaultAsync();

            return Ok(new { success = true, message = createdMessage });
        }



    }

    public class CreateTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Status { get; set; }
        public int? TaskTypeId { get; set; }
        public int? CollectionId { get; set; }
    }

    public class UpdateTaskStatusRequest
    {
        public string? Status { get; set; }
        public string? Title { get; set; }
        public bool? Completed { get; set; }
        public List<FieldValueRequest>? FieldValues { get; set; }
        public int? CollectionId { get; set; }
    }

    public class FieldValueRequest
    {
        public int? Id { get; set; }
        public int TaskFieldId { get; set; }
        public string Value { get; set; }
    }
    public class AssignUserRequest
    {
        public string UserId { get; set; } = string.Empty;
    }
    public class SetDueDateRequest
    {
        public DateTime? DueDate { get; set; }
    }
    public class CreateMessageRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
