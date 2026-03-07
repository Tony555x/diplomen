using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Taskboard.Data.Models;

namespace Taskboard.Services
{
    // DTO that mirrors the JSON stored in DashboardWidget.Source
    public class WidgetQueryDto
    {
        public string Select { get; set; } = "tasks";               // "tasks" | "members"
        public List<WidgetFilterDto> Filters { get; set; } = new();
        public string? GroupBy { get; set; }                        // "status"|"completed"|"type"|"role"|null
        public WidgetAggregateDto? Aggregate { get; set; }
        public string? Value { get; set; }                          // alternative to groupBy — single property
    }

    public class WidgetFilterDto
    {
        public string Field { get; set; } = "";   // "status"|"completed"|"type"|"assigneeCount"|"dueDate"|"isBlocked"|"overdue"|"role"|"taskCount"|"field:X"
        public string Op { get; set; } = "=";     // "="|"!="|">"|">="|"<"|"<="
        public string Value { get; set; } = "";
    }

    public class WidgetAggregateDto
    {
        public string Func { get; set; } = "count";  // "count"
    }

    public class WidgetService : IWidgetService
    {
        private readonly AppDbContext _context;

        public WidgetService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<WidgetResult> ExecuteQueryAsync(DashboardWidget widget)
        {
            if (string.IsNullOrWhiteSpace(widget.Source))
                return new WidgetResult { ResultType = "TaskList", Data = new List<object>() };

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            WidgetQueryDto query;
            try
            {
                query = JsonSerializer.Deserialize<WidgetQueryDto>(widget.Source, options)
                        ?? new WidgetQueryDto();
            }
            catch
            {
                throw new ArgumentException("Invalid widget query JSON.");
            }

            if (query.Select?.ToLower() == "members")
                return await ExecuteMembersQueryAsync(widget.ProjectId, query);

            return await ExecuteTasksQueryAsync(widget.ProjectId, query);
        }

        // ─── TASKS ──────────────────────────────────────────────────────────────

        private async Task<WidgetResult> ExecuteTasksQueryAsync(int projectId, WidgetQueryDto query)
        {
            // Load all tasks for the project with required navigation properties
            var allTasks = await _context.Tasks
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.TaskType).ThenInclude(tt => tt!.Fields)
                .Include(t => t.UserTasks).ThenInclude(ut => ut.User)
                .Include(t => t.FieldValues).ThenInclude(fv => fv.TaskField)
                .ToListAsync();

            // Pre-compute isBlocked in memory (needs subquery join)
            var blockedIds = await _context.TaskBlockers
                .Where(tb => tb.BlockedTask!.ProjectId == projectId && !tb.BlockingTask!.Completed)
                .Select(tb => tb.BlockedTaskId)
                .Distinct()
                .ToListAsync();

            var blockedSet = new HashSet<int>(blockedIds);

            // Apply filters in memory
            var filtered = allTasks.Where(t => MatchesTaskFilters(t, query.Filters, blockedSet)).ToList();

            // GroupBy + Aggregate
            if (!string.IsNullOrWhiteSpace(query.GroupBy))
            {
                var groups = GroupTasks(filtered, query.GroupBy, query.Aggregate?.Func ?? "count");
                return new WidgetResult { ResultType = "GroupedResult", Data = groups };
            }

            // Map to DTO
            var data = filtered.Select(t => MapTask(t, blockedSet)).ToList<object>();
            return new WidgetResult { ResultType = "TaskList", Data = data };
        }

        private bool MatchesTaskFilters(TaskItem t, List<WidgetFilterDto> filters, HashSet<int> blockedSet)
        {
            foreach (var f in filters)
            {
                var field = f.Field.ToLower();
                var op = f.Op;
                var val = f.Value;

                switch (field)
                {
                    case "completed":
                        if (!bool.TryParse(val, out var bComplete)) break;
                        if (!ApplyBoolOp(t.Completed, bComplete, op)) return false;
                        break;

                    case "status":
                        if (!ApplyStringOp(t.Status, val, op)) return false;
                        break;

                    case "type":
                        var typeName = t.TaskType?.Name ?? "";
                        if (!ApplyStringOp(typeName, val, op)) return false;
                        break;

                    case "assigneecount":
                        if (!double.TryParse(val, out var assigneeTarget)) break;
                        if (!ApplyNumericOp(t.UserTasks?.Count ?? 0, assigneeTarget, op)) return false;
                        break;

                    case "isblocked":
                        if (!bool.TryParse(val, out var bBlocked)) break;
                        var isBlocked = blockedSet.Contains(t.Id);
                        if (!ApplyBoolOp(isBlocked, bBlocked, op)) return false;
                        break;

                    case "overdue":
                        if (!bool.TryParse(val, out var bOverdue)) break;
                        var isOverdue = t.DueDate.HasValue && !t.Completed && t.DueDate.Value < DateTime.UtcNow;
                        if (!ApplyBoolOp(isOverdue, bOverdue, op)) return false;
                        break;

                    case "duedate":
                        if (!DateTime.TryParse(val, out var dateTarget)) break;
                        if (t.DueDate == null) return false;
                        if (!ApplyNumericOp((t.DueDate.Value - DateTime.UtcNow).TotalDays, (dateTarget - DateTime.UtcNow).TotalDays, op)) return false;
                        break;

                    default:
                        // Task-type custom field: "field:FieldName"
                        if (field.StartsWith("field:"))
                        {
                            var fieldName = f.Field.Substring(6);
                            var fv = t.FieldValues?.FirstOrDefault(v => v.TaskField?.Name == fieldName);
                            // If task has no such field, treat filter as false
                            if (fv == null) return false;
                            if (!ApplyStringOp(fv.Value ?? "", val, op)) return false;
                        }
                        break;
                }
            }
            return true;
        }

        private List<object> GroupTasks(List<TaskItem> tasks, string groupBy, string aggFunc)
        {
            IEnumerable<IGrouping<(string Label, string? Icon), TaskItem>> groups;

            switch (groupBy.ToLower())
            {
                case "status":
                    groups = tasks.GroupBy(t => (t.Status ?? "(Unknown)", (string?)null));
                    break;
                case "completed":
                    groups = tasks.GroupBy(t => (t.Completed ? "Completed" : "Incomplete", (string?)null));
                    break;
                case "type":
                    groups = tasks.GroupBy(t => (t.TaskType?.Name ?? "(No type)", t.TaskType?.Icon));
                    break;
                default:
                    if (groupBy.StartsWith("field:", StringComparison.OrdinalIgnoreCase))
                    {
                        var fieldName = groupBy.Substring(6);
                        groups = tasks.GroupBy(t =>
                            (t.FieldValues?.FirstOrDefault(fv => fv.TaskField?.Name == fieldName)?.Value ?? "(none)", (string?)null));
                    }
                    else
                    {
                        groups = tasks.GroupBy(t => (t.Status ?? "(Unknown)", (string?)null));
                    }
                    break;
            }

            return groups.Select(g => (object)new
            {
                Label = g.Key.Label,
                Icon = g.Key.Icon,
                Value = aggFunc.ToLower() == "count" ? g.Count() : 0
            }).OrderBy(x => ((dynamic)x).Label).ToList();
        }

        private object MapTask(TaskItem t, HashSet<int> blockedSet) => new
        {
            t.Id,
            t.Title,
            t.Status,
            t.Completed,
            t.DueDate,
            IsBlocked = blockedSet.Contains(t.Id),
            TaskType = t.TaskType != null ? new { t.TaskType.Name, t.TaskType.Icon } : null,
            Assignees = t.UserTasks?.Select(ut => ut.User?.UserName).ToList()
        };

        // ─── MEMBERS ─────────────────────────────────────────────────────────────

        private async Task<WidgetResult> ExecuteMembersQueryAsync(int projectId, WidgetQueryDto query)
        {
            var allMembers = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && pm.Status == ProjectMemberStatus.Active)
                .Include(pm => pm.User)
                .Include(pm => pm.ProjectRole)
                .ToListAsync();

            // Precompute task counts per user
            var taskCounts = await _context.UserTasks
                .Where(ut => ut.TaskItem!.ProjectId == projectId)
                .GroupBy(ut => ut.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count);

            var filtered = allMembers.Where(m => MatchesMemberFilters(m, query.Filters, taskCounts)).ToList();

            if (!string.IsNullOrWhiteSpace(query.GroupBy))
            {
                var groups = GroupMembers(filtered, query.GroupBy, query.Aggregate?.Func ?? "count", taskCounts);
                return new WidgetResult { ResultType = "GroupedResult", Data = groups };
            }

            var data = filtered.Select(m => (object)new
            {
                m.UserId,
                UserName = m.User?.UserName ?? m.UserId,
                Email = m.User?.Email,
                AvatarColor = m.User?.AvatarColor,
                Role = m.ProjectRole?.RoleName ?? "Member",
                TaskCount = taskCounts.TryGetValue(m.UserId, out var tc) ? tc : 0
            }).ToList();

            return new WidgetResult { ResultType = "MemberList", Data = data };
        }

        private bool MatchesMemberFilters(ProjectMember m, List<WidgetFilterDto> filters, Dictionary<string, int> taskCounts)
        {
            foreach (var f in filters)
            {
                switch (f.Field.ToLower())
                {
                    case "role":
                        if (!ApplyStringOp(m.ProjectRole?.RoleName ?? "", f.Value, f.Op)) return false;
                        break;
                    case "taskcount":
                        if (!double.TryParse(f.Value, out var target)) break;
                        var count = taskCounts.TryGetValue(m.UserId, out var tc) ? tc : 0;
                        if (!ApplyNumericOp(count, target, f.Op)) return false;
                        break;
                }
            }
            return true;
        }

        private List<object> GroupMembers(List<ProjectMember> members, string groupBy, string aggFunc, Dictionary<string, int> taskCounts)
        {
            IEnumerable<IGrouping<(string Label, string? Icon), ProjectMember>> groups;
            switch (groupBy.ToLower())
            {
                case "role":
                    groups = members.GroupBy(m => (m.ProjectRole?.RoleName ?? "(No role)", (string?)null));
                    break;
                default:
                    groups = members.GroupBy(m => (m.ProjectRole?.RoleName ?? "(No role)", (string?)null));
                    break;
            }

            return groups.Select(g => (object)new
            {
                Label = g.Key.Label,
                Icon = g.Key.Icon,
                Value = aggFunc.ToLower() == "count" ? g.Count() : 0
            }).OrderBy(x => ((dynamic)x).Label).ToList();
        }

        // ─── Helpers ─────────────────────────────────────────────────────────────

        private bool ApplyBoolOp(bool actual, bool target, string op)
            => op == "!=" ? actual != target : actual == target;

        private bool ApplyStringOp(string actual, string target, string op)
        {
            return op switch
            {
                "!=" => !string.Equals(actual, target, StringComparison.OrdinalIgnoreCase),
                _    => string.Equals(actual, target, StringComparison.OrdinalIgnoreCase)
            };
        }

        private bool ApplyNumericOp(double actual, double target, string op)
        {
            return op switch
            {
                ">"  => actual > target,
                ">=" => actual >= target,
                "<"  => actual < target,
                "<=" => actual <= target,
                "!=" => actual != target,
                _    => actual == target
            };
        }
    }
}
