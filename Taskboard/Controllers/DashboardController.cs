using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/projects/{projectId}/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWidgetService _widgetService;
        private readonly UserManager<User> _userManager;

        public DashboardController(AppDbContext context, IWidgetService widgetService, UserManager<User> userManager)
        {
            _context = context;
            _widgetService = widgetService;
            _userManager = userManager;
        }

        [HttpGet("widgets")]
        public async Task<IActionResult> GetWidgets(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var widgets = await _context.DashboardWidgets
                .Where(w => w.UserId == userId && w.ProjectId == projectId)
                .ToListAsync();

            var results = new List<object>();

            foreach(var widget in widgets)
            {
                if (widget.Type == WidgetType.ListResult)
                {
                    try 
                    {
                        var (list, listType) = await _widgetService.ProcessListResultAsync(widget);
                        
                        object processedData = list;
                        if (listType == "Task" || listType == "TypedTask")
                        {
                            processedData = list.Cast<TaskItem>().Select(t => new {
                                t.Id,
                                t.Title,
                                t.Status,
                                t.Completed,
                                t.DueDate,
                                TaskType = t.TaskType != null ? new { t.TaskType.Name } : null,
                                Assignees = t.UserTasks?.Select(ut => ut.User?.UserName).ToList()
                            }).ToList();
                        }
                        else if (listType == "Member")
                        {
                            processedData = list.Cast<ProjectMember>().Select(m => new {
                                m.ProjectId,
                                m.UserId,
                                User = m.User != null ? new { m.User.UserName } : null,
                                ProjectRole = m.ProjectRole != null ? new { m.ProjectRole.RoleName } : null,
                                m.JoinedAt,
                                Status = m.Status.ToString()
                            }).ToList();
                        }

                        results.Add(new {
                            widget.Id,
                            widget.Source,
                            widget.Type,
                            ListType = listType,
                            Data = processedData,
                            Error = (string)null
                        });
                    }
                    catch (System.Exception ex)
                    {
                        results.Add(new {
                            widget.Id,
                            widget.Source,
                            widget.Type,
                            ListType = "Error",
                            Data = new List<object>(),
                            Error = ex.Message
                        });
                    }
                }
            }

            return Ok(results);
        }

        public class CreateWidgetDto
        {
            public WidgetType Type { get; set; }
            public string Source { get; set; }
        }

        [HttpPost("widgets")]
        public async Task<IActionResult> CreateWidget(int projectId, [FromBody] CreateWidgetDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var widget = new DashboardWidget
            {
                UserId = userId,
                ProjectId = projectId,
                Type = dto.Type,
                Source = dto.Source,
                Result=""
            };

            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();

            return Ok(widget);
        }
    }
}
