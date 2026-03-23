using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Contracts;
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
        private readonly IProjectAccessService _projectAccessService;

        public TasksController(AppDbContext context, INotificationService notificationService, IProjectAccessService projectAccessService)
        {
            _context = context;
            _notificationService = notificationService;
            _projectAccessService = projectAccessService;
        }

        // Helper: non-archived tasks for a project
        private IQueryable<TaskItem> ActiveTasks(int projectId) =>
            _context.Tasks.Where(t => t.ProjectId == projectId && !t.IsArchived);

        // Helper: all tasks for a project (including archived, for archive-specific endpoints)
        private IQueryable<TaskItem> AllTasks(int projectId) =>
            _context.Tasks.Where(t => t.ProjectId == projectId);

        [HttpGet]
        public async Task<IActionResult> GetProjectTasks(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var tasks = await ActiveTasks(projectId)
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
                    t.ParentTaskId,
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
                        fv.Value
                    }).ToList()
                })
                .ToListAsync();

            return Ok(tasks);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTask(int projectId, [FromBody] CreateTaskRequest request)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();
            if (membership.ProjectRole?.CanCreateEditDeleteTasks != true) return Forbid();

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { success = false, message = "Task title is required." });
            }

            if (request.CollectionId.HasValue)
            {
                var collectionExists = await _context.Collections
                    .AnyAsync(c => c.Id == request.CollectionId.Value && c.ProjectId == projectId);

                if (!collectionExists)
                {
                    return BadRequest(new { success = false, message = "Collection not found." });
                }
            }

            if (request.ParentTaskId.HasValue)
            {
                var parentTask = await ActiveTasks(projectId).FirstOrDefaultAsync(t => t.Id == request.ParentTaskId.Value);
                if (parentTask == null)
                    return BadRequest(new { success = false, message = "Parent task not found." });
                if (parentTask.ParentTaskId != null)
                    return BadRequest(new { success = false, message = "Subtasks cannot have subtasks." });
            }

            var task = new TaskItem
            {
                Title = request.Title.Trim(),
                ProjectId = projectId,
                Status = request.Status ?? "To Do",
                Completed = false,
                TaskTypeId = request.TaskTypeId,
                CollectionId = request.CollectionId,
                ParentTaskId = request.ParentTaskId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

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

            _context.TaskHistories.Add(new TaskHistory
            {
                TaskId = task.Id,
                UserId = userId,
                ActionType = "Created",
                Details = $"{task.Title}",
                CreatedAt = DateTime.UtcNow
            });
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
                    task.CollectionId,
                    task.ParentTaskId,
                    FieldValues = new List<object>()
                }
            });
        }


        [HttpGet("project-info")]
        public async Task<IActionResult> GetProjectInfo(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var project = await _context.Projects
                .Where(p => p.Id == projectId)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.WorkspaceId,
                    p.AccessLevel
                })
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound(new { success = false, message = "Project not found." });
            }

            return Ok(project);
        }

        [HttpPatch("{taskId}")]
        public async Task<IActionResult> UpdateTask(int projectId, int taskId, [FromBody] UpdateTaskRequest request)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var membership = await _projectAccessService.GetMembershipAsync(projectId, userId);
            var canEditTasks = membership.ProjectRole?.CanCreateEditDeleteTasks == true;

            var task = await ActiveTasks(projectId)
                .Include(t => t.FieldValues)
                .FirstOrDefaultAsync(t => t.Id == taskId);

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
                    
                    var targetStatus = await _context.UserTaskStatuses
                        .FirstOrDefaultAsync(s => s.ProjectId == projectId && s.Name == request.Status);

                    if (targetStatus != null && targetStatus.AutoComplete && !task.Completed)
                    {
                        task.Completed = true;
                        _context.TaskHistories.Add(new TaskHistory
                        {
                            TaskId = task.Id,
                            UserId = userId,
                            ActionType = "Marked this card as completed",
                            Details = "automatically via column rules"
                        });
                    }

                    task.Status = request.Status;
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                if (canEditTasks)
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

            if (request.FieldValues != null && request.FieldValues.Count > 0)
            {
                if (canEditTasks)
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
            }

            if (request.CollectionId.HasValue)
            {
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

        // Archive a task (soft-delete) — previously DELETE
        [HttpDelete("{taskId}")]
        public async Task<IActionResult> ArchiveTask(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();
            if (membership.ProjectRole?.CanCreateEditDeleteTasks != true) return Forbid();

            var task = await ActiveTasks(projectId).FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
            {
                return NotFound(new { success = false, message = "Task not found." });
            }

            task.IsArchived = true;
            task.ArchivedAt = DateTime.UtcNow;

            _context.TaskHistories.Add(new TaskHistory
            {
                TaskId = task.Id,
                UserId = userId,
                ActionType = "Archived",
                Details = null,
                CreatedAt = DateTime.UtcNow
            });

            var subtasks = await _context.Tasks
                .Where(t => t.ParentTaskId == taskId && t.ProjectId == projectId && !t.IsArchived)
                .ToListAsync();

            foreach (var subtask in subtasks)
            {
                subtask.IsArchived = true;
                subtask.ArchivedAt = DateTime.UtcNow;

                _context.TaskHistories.Add(new TaskHistory
                {
                    TaskId = subtask.Id,
                    UserId = userId,
                    ActionType = "Archived",
                    Details = "automatically via parent task",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true, taskId });
        }

        // Get list of archived tasks for a project
        [HttpGet("archived")]
        public async Task<IActionResult> GetArchivedTasks(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var tasks = await _context.Tasks
                .Where(t => t.ProjectId == projectId && t.IsArchived && t.ParentTaskId == null)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Status,
                    t.Completed,
                    t.ArchivedAt,
                    t.TaskTypeId,
                    Assignees = t.UserTasks.Select(ut => new
                    {
                        ut.UserId,
                        ut.User!.UserName,
                        ut.User.AvatarColor
                    }).ToList()
                })
                .OrderByDescending(t => t.ArchivedAt)
                .ToListAsync();

            return Ok(tasks);
        }

        // Restore an archived task
        [HttpPost("{taskId}/restore")]
        public async Task<IActionResult> RestoreTask(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();
            if (membership.ProjectRole?.CanCreateEditDeleteTasks != true) return Forbid();

            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId && t.IsArchived);

            if (task == null)
                return NotFound(new { success = false, message = "Archived task not found." });

            task.IsArchived = false;
            task.ArchivedAt = null;

            _context.TaskHistories.Add(new TaskHistory
            {
                TaskId = task.Id,
                UserId = userId,
                ActionType = "Restored",
                Details = null,
                CreatedAt = DateTime.UtcNow
            });

            var subtasks = await _context.Tasks
                .Where(t => t.ParentTaskId == taskId && t.ProjectId == projectId && t.IsArchived)
                .ToListAsync();

            foreach (var subtask in subtasks)
            {
                subtask.IsArchived = false;
                subtask.ArchivedAt = null;

                _context.TaskHistories.Add(new TaskHistory
                {
                    TaskId = subtask.Id,
                    UserId = userId,
                    ActionType = "Restored",
                    Details = "automatically via parent task",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true, taskId });
        }

        // Permanently delete an archived task
        [HttpDelete("{taskId}/permanent")]
        public async Task<IActionResult> PermanentDeleteTask(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.Status == ProjectMemberStatus.Active);

            if (membership == null) return Forbid();
            if (membership.ProjectRole?.CanCreateEditDeleteTasks != true) return Forbid();

            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId && (t.IsArchived || t.ParentTaskId != null));

            if (task == null)
                return NotFound(new { success = false, message = "Task not found or cannot be permanently deleted." });

            // Delete subtasks and their related data
            var subtaskIds = await _context.Tasks
                .Where(t => t.ParentTaskId == taskId)
                .Select(t => t.Id)
                .ToListAsync();

            if (subtaskIds.Any())
            {
                var subtaskFieldValues = await _context.TaskFieldValues
                    .Where(fv => subtaskIds.Contains(fv.TaskId))
                    .ToListAsync();
                _context.TaskFieldValues.RemoveRange(subtaskFieldValues);

                var subtaskUserTasks = await _context.UserTasks
                    .Where(ut => subtaskIds.Contains(ut.TaskItemId))
                    .ToListAsync();
                _context.UserTasks.RemoveRange(subtaskUserTasks);

                var subtasks = await _context.Tasks
                    .Where(t => t.ParentTaskId == taskId)
                    .ToListAsync();
                _context.Tasks.RemoveRange(subtasks);
            }

            var fieldValues = await _context.TaskFieldValues
                .Where(fv => fv.TaskId == taskId)
                .ToListAsync();
            _context.TaskFieldValues.RemoveRange(fieldValues);

            var blockers = await _context.TaskBlockers
                .Where(tb => tb.BlockingTaskId == taskId || tb.BlockedTaskId == taskId)
                .ToListAsync();
            _context.TaskBlockers.RemoveRange(blockers);

            var userTasks = await _context.UserTasks
                .Where(ut => ut.TaskItemId == taskId)
                .ToListAsync();
            _context.UserTasks.RemoveRange(userTasks);

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, taskId });
        }

        [HttpGet("{taskId}/assignees")]
        public async Task<IActionResult> GetTaskAssignees(int projectId, int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var assignees = await _context.UserTasks
                .Where(ut => ut.TaskItemId == taskId)
                .Select(ut => new
                {
                    ut.UserId,
                    ut.User!.UserName,
                    ut.User!.AvatarColor
                })
                .ToListAsync();

            return Ok(assignees);
        }

        [HttpPost("{taskId}/assignees")]
        public async Task<IActionResult> AssignUserToTask(int projectId, int taskId, [FromBody] AssignUserRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

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
            
            var assignedUser = await _context.Users.FindAsync(request.UserId);
            _context.TaskHistories.Add(new TaskHistory
            {
                TaskId = taskId,
                UserId = userId,
                ActionType = "Assigned",
                Details = $"{assignedUser?.UserName ?? "Unknown User"} to this card"
            });
            
            
            await _context.SaveChangesAsync();

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var assignment = await _context.UserTasks
                .FirstOrDefaultAsync(ut => ut.TaskItemId == taskId && ut.UserId == assignedUserId);

            if (assignment == null) return NotFound();

            _context.UserTasks.Remove(assignment);
            
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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var task = await ActiveTasks(projectId).FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) return NotFound(new { success = false, message = "Task not found." });

            return Ok(new { dueDate = task.DueDate });
        }

        [HttpPut("{taskId}/due-date")]
        public async Task<IActionResult> SetTaskDueDate(int projectId, int taskId, [FromBody] SetDueDateRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var task = await ActiveTasks(projectId).FirstOrDefaultAsync(t => t.Id == taskId);

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var taskExists = await ActiveTasks(projectId).AnyAsync(t => t.Id == taskId);
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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

            var tasksExist = await ActiveTasks(projectId)
                .Where(t => t.Id == taskId || t.Id == request.BlockerTaskId)
                .CountAsync();

            if (tasksExist != 2)
            {
                return BadRequest(new { success = false, message = "One or both tasks not found." });
            }

            if (taskId == request.BlockerTaskId)
            {
                return BadRequest(new { success = false, message = "A task cannot block itself." });
            }

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

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

            if (!await _projectAccessService.HasViewAccessAsync(projectId, userId))
                return Forbid();

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

}
