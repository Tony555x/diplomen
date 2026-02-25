using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data;
using Taskboard.Data.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public NotificationsController(AppDbContext context)
    {
        _context = context;
    }

    private static object MapNotification(Notification n, Dictionary<int, int> taskProjectMap)
    {
        int? projectId = null;
        if (n.Type == NotificationType.TaskAssignment && n.RelatedEntityId.HasValue)
            taskProjectMap.TryGetValue(n.RelatedEntityId.Value, out int pid);

        if (n.Type == NotificationType.TaskAssignment && n.RelatedEntityId.HasValue &&
            taskProjectMap.TryGetValue(n.RelatedEntityId.Value, out int resolvedProjectId))
        {
            projectId = resolvedProjectId;
        }

        return new
        {
            n.Id,
            n.Title,
            n.Message,
            n.IsRead,
            n.CreatedAt,
            Type = n.Type.ToString(),
            RelatedEntityId = n.RelatedEntityId,
            RelatedProjectId = projectId
        };
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatest()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(5)
            .ToListAsync();

        var taskIds = notifications
            .Where(n => n.Type == NotificationType.TaskAssignment && n.RelatedEntityId.HasValue)
            .Select(n => n.RelatedEntityId!.Value)
            .Distinct()
            .ToList();

        var taskProjectMap = await _context.Tasks
            .Where(t => taskIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.ProjectId);

        return Ok(notifications.Select(n => MapNotification(n, taskProjectMap)));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var taskIds = notifications
            .Where(n => n.Type == NotificationType.TaskAssignment && n.RelatedEntityId.HasValue)
            .Select(n => n.RelatedEntityId!.Value)
            .Distinct()
            .ToList();

        var taskProjectMap = await _context.Tasks
            .Where(t => taskIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.ProjectId);

        return Ok(notifications.Select(n => MapNotification(n, taskProjectMap)));
    }

    [HttpPost("{id}/mark-read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok();
    }
}
