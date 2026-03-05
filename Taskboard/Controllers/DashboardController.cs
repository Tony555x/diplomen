using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskboard.Contracts.Projects;
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

        // ─── Widget Templates ────────────────────────────────────────────────────

        [HttpGet("widget-templates")]
        public async Task<IActionResult> GetWidgetTemplates(int projectId)
        {
            // Fetch available custom fields for the project so the frontend can populate them
            var taskFields = await _context.TaskFields
                .Where(tf => tf.TaskType!.ProjectId == projectId)
                .Select(tf => new { tf.Name, tf.Type, TaskTypeName = tf.TaskType!.Name })
                .Distinct()
                .ToListAsync();

            var statuses = await _context.UserTaskStatuses
                .Where(s => s.ProjectId == projectId)
                .OrderBy(s => s.Order)
                .Select(s => s.Name)
                .ToListAsync();

            var taskTypes = await _context.TaskTypes
                .Where(tt => tt.ProjectId == projectId)
                .Select(tt => new { tt.Id, tt.Name, tt.Icon })
                .ToListAsync();

            var roles = await _context.ProjectRoles
                .Where(r => r.ProjectId == projectId)
                .Select(r => r.RoleName)
                .OrderBy(r => r)
                .ToListAsync();

            var templates = await _context.WidgetTemplates
                .OrderBy(t => t.Id)
                .ToListAsync();

            return Ok(new
            {
                templates,
                projectContext = new
                {
                    statuses,
                    taskTypes,
                    taskFields,
                    roles
                }
            });
        }

        // ─── Widgets CRUD ────────────────────────────────────────────────────────

        [HttpGet("widgets")]
        public async Task<IActionResult> GetWidgets(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var widgets = await _context.DashboardWidgets
                .Where(w => w.UserId == userId && w.ProjectId == projectId)
                .ToListAsync();

            var results = new List<object>();

            foreach (var widget in widgets)
            {
                try
                {
                    var result = await _widgetService.ExecuteQueryAsync(widget);
                    results.Add(new
                    {
                        widget.Id,
                        widget.Name,
                        widget.Source,
                        widget.Type,
                        result.ResultType,
                        Data = result.Data,
                        Error = (string?)null
                    });
                }
                catch (System.Exception ex)
                {
                    results.Add(new
                    {
                        widget.Id,
                        widget.Name,
                        widget.Source,
                        widget.Type,
                        ResultType = "Error",
                        Data = new List<object>(),
                        Error = ex.Message
                    });
                }
            }

            return Ok(results);
        }

        [HttpPost("widgets")]
        public async Task<IActionResult> CreateWidget(int projectId, [FromBody] CreateWidgetDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var widget = new DashboardWidget
            {
                UserId = userId,
                ProjectId = projectId,
                Name = dto.Name,
                Type = dto.Type,
                Source = dto.Source,
                Result = ""
            };

            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();

            return Ok(widget);
        }

        [HttpPut("widgets/{widgetId}")]
        public async Task<IActionResult> UpdateWidget(int projectId, int widgetId, [FromBody] CreateWidgetDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var widget = await _context.DashboardWidgets
                .FirstOrDefaultAsync(w => w.Id == widgetId && w.UserId == userId && w.ProjectId == projectId);

            if (widget == null) return NotFound();

            widget.Name = dto.Name;
            widget.Type = dto.Type;
            widget.Source = dto.Source;

            await _context.SaveChangesAsync();
            return Ok(widget);
        }

        [HttpDelete("widgets/{widgetId}")]
        public async Task<IActionResult> DeleteWidget(int projectId, int widgetId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var widget = await _context.DashboardWidgets
                .FirstOrDefaultAsync(w => w.Id == widgetId && w.UserId == userId && w.ProjectId == projectId);

            if (widget == null) return NotFound();

            _context.DashboardWidgets.Remove(widget);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
    }
}
