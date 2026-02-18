using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Controllers
{
    [Authorize]
    [Route("api/projects/{projectId}/tasks")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;

        public TasksController(AppDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProjectTasks(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

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
                    Assignees = t.UserTasks.Select(ut => new 
                    {
                        ut.UserId,
                        ut.User!.UserName,
                        ut.User.AvatarColor
                    }).ToList(),
                    Blockers = _context.TaskBlockers
                        .Where(tb => tb.BlockedTaskId == t.Id)
                        .Select(tb => new 
                        {
                            tb.BlockingTask!.Id,
                            tb.BlockingTask.Title,
                            tb.BlockingTask.Completed
                        }).ToList(),
                    DueDate = t.DueDate,
                    IsBlocked = _context.TaskBlockers
                        .Any(tb => tb.BlockedTaskId == t.Id && !tb.BlockingTask.Completed),
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

            // Verify user has permission to create tasks
            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();
            if (membership.ProjectRole?.CanCreateEditDeleteTasks != true) return Forbid();

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
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

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

            // Load membership with role to check permissions
            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();

            var canEditTasks = membership.ProjectRole?.CanCreateEditDeleteTasks == true;

            var task = await _context.Tasks
                .Include(t => t.FieldValues)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);

            if (task == null)
            {
                return NotFound(new { success = false, message = "Task not found." });
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                if (task.Status != request.Status)
                {
                    _context.TaskHistories.Add(new TaskHistory
                    {
                        TaskId = task.Id,
                        UserId = userId,
                        ActionType = "Moved this card to",
                        Details = request.Status
                    });
                    task.Status = request.Status;
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                if (!canEditTasks) return Forbid();
                task.Title = request.Title;
            }

            if (request.Completed.HasValue)
            {
                if (task.Completed != request.Completed.Value)
                {
                    _context.TaskHistories.Add(new TaskHistory
                    {
                        TaskId = task.Id,
                        UserId = userId,
                        ActionType = request.Completed.Value ? "Marked this card as completed" : "Marked this card as uncompleted",
                        Details = null
                    });
                    task.Completed = request.Completed.Value;
                }
            }

            // Update field values if provided
            if (request.FieldValues != null && request.FieldValues.Count > 0)
            {
                if (!canEditTasks) return Forbid();
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
                    task.TaskTypeId,
                    IsBlocked = await _context.TaskBlockers
                        .AnyAsync(tb => tb.BlockedTaskId == task.Id && !tb.BlockingTask.Completed)
                }
            });
        }
        [HttpDelete("{taskId}")]
        public async Task<IActionResult> DeleteTask(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user has permission to delete tasks
            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();
            if (membership.ProjectRole?.CanCreateEditDeleteTasks != true) return Forbid();

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
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

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
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (!hasAccess) return Forbid();

            // Verify the user being assigned is an active member of the project
            var userToAssign = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == request.UserId);

            if (userToAssign == null)
                return BadRequest(new { success = false, message = "User is not a member of this project." });

            if (userToAssign.Status != ProjectMemberStatus.Active)
                return BadRequest(new { success = false, message = "Cannot assign users who have not accepted the project invite." });

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
            
            // Log history
            var assignedUser = await _context.Users.FindAsync(request.UserId);
            _context.TaskHistories.Add(new TaskHistory
            {
                TaskId = taskId,
                UserId = userId,
                ActionType = "Assigned",
                Details = $"{assignedUser?.UserName ?? "Unknown User"} to this card"
            });
            
            
            await _context.SaveChangesAsync();

            // Send notification
            var task = await _context.Tasks.FindAsync(taskId);
            var assigner = await _context.Users.FindAsync(userId);
            
            if (task != null && assignedUser != null && assigner != null)
            {
                await _notificationService.SendTaskAssignmentAsync(task, assigner, assignedUser);
            }

            return Ok(new { success = true });
        }

        [HttpDelete("{taskId}/assignees/{assignedUserId}")]
        public async Task<IActionResult> RemoveUserFromTask(int projectId, int taskId, string assignedUserId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (!hasAccess) return Forbid();

            var assignment = await _context.UserTasks
                .FirstOrDefaultAsync(ut => ut.TaskItemId == taskId && ut.UserId == assignedUserId);

            if (assignment == null) return NotFound();

            _context.UserTasks.Remove(assignment);
            
            // Log history
             var unassignedUser = await _context.Users.FindAsync(assignedUserId);
             _context.TaskHistories.Add(new TaskHistory
            {
                TaskId = taskId,
                UserId = userId,
                ActionType = "Removed",
                Details = $"{unassignedUser?.UserName ?? "Unknown User"} from this card"
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
        [HttpGet("{taskId}/due-date")]
        public async Task<IActionResult> GetTaskDueDate(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
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
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
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
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
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
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
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

        [HttpGet("{taskId}/blockers")]
        public async Task<IActionResult> GetTaskBlockers(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
            if (!hasAccess) return Forbid();

            var blockers = await _context.TaskBlockers
                .Where(tb => tb.BlockedTaskId == taskId)
                .Select(tb => new
                {
                    tb.BlockingTask!.Id,
                    tb.BlockingTask.Title,
                    tb.BlockingTask.Completed
                })
                .ToListAsync();

            return Ok(blockers);
        }

        [HttpGet("{taskId}/blocking")]
        public async Task<IActionResult> GetBlockedTasks(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
            if (!hasAccess) return Forbid();

            var blockedTasks = await _context.TaskBlockers
                .Where(tb => tb.BlockingTaskId == taskId)
                .Select(tb => new
                {
                    tb.BlockedTask!.Id,
                    tb.BlockedTask.Title,
                    tb.BlockedTask.Completed
                })
                .ToListAsync();

            return Ok(blockedTasks);
        }

        [HttpPost("{taskId}/blockers")]
        public async Task<IActionResult> AddBlocker(int projectId, int taskId, [FromBody] AddBlockerRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
            if (!hasAccess) return Forbid();

            // Verify both tasks exist and belong to the same project
            var tasksExist = await _context.Tasks
                .Where(t => t.ProjectId == projectId && (t.Id == taskId || t.Id == request.BlockerTaskId))
                .CountAsync();

            if (tasksExist != 2)
            {
                return BadRequest(new { success = false, message = "One or both tasks not found." });
            }

            // Prevent self-blocking
            if (taskId == request.BlockerTaskId)
            {
                return BadRequest(new { success = false, message = "A task cannot block itself." });
            }

            // Check if relationship already exists
            var alreadyExists = await _context.TaskBlockers
                .AnyAsync(tb => tb.BlockingTaskId == request.BlockerTaskId && tb.BlockedTaskId == taskId);

            if (alreadyExists) return Ok(new { success = true });

            var blocker = new TaskBlocker
            {
                BlockingTaskId = request.BlockerTaskId,
                BlockedTaskId = taskId
            };

            _context.TaskBlockers.Add(blocker);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpDelete("{taskId}/blockers/{blockerTaskId}")]
        public async Task<IActionResult> RemoveBlocker(int projectId, int taskId, int blockerTaskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
            if (!hasAccess) return Forbid();

            var blocker = await _context.TaskBlockers
                .FirstOrDefaultAsync(tb => tb.BlockingTaskId == blockerTaskId && tb.BlockedTaskId == taskId);

            if (blocker == null) return NotFound();

            _context.TaskBlockers.Remove(blocker);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }



        [HttpGet("{taskId}/history")]
        public async Task<IActionResult> GetTaskHistory(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);
            if (!hasAccess) return Forbid();

            var history = await _context.TaskHistories
                .Where(th => th.TaskId == taskId)
                .OrderByDescending(th => th.CreatedAt)
                .Select(th => new
                {
                    th.Id,
                    th.ActionType,
                    th.Details,
                    th.CreatedAt,
                    th.UserId,
                    UserName = th.User!.UserName
                })
                .ToListAsync();

            return Ok(history);
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
    public class AddBlockerRequest
    {
        public int BlockerTaskId { get; set; }
    }
}
