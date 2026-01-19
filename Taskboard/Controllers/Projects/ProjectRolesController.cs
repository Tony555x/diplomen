using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskboard.Contracts.Projects;
using Taskboard.Data.Models;

namespace Taskboard.Controllers.Projects;

[Authorize]
[Route("api/projects/{projectId}/roles")]
[ApiController]
public class ProjectRolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProjectRolesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateProjectRole(int projectId, [FromBody] CreateProjectRoleRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var currentMember = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (currentMember?.ProjectRole?.CanAddEditMembers != true) return Forbid();

        if (string.IsNullOrWhiteSpace(request.RoleName))
            return BadRequest(new { success = false, message = "Role name is required." });

        ProjectRole? role;

        if (request.RoleId.HasValue)
        {
            role = await _context.ProjectRoles.FirstOrDefaultAsync(r => r.Id == request.RoleId.Value && r.ProjectId == projectId && !r.IsOwner);
            if (role == null) return NotFound();
        }
        else
        {
            role = new ProjectRole { ProjectId = projectId, IsOwner = false };
            _context.ProjectRoles.Add(role);
        }

        var roleExists = await _context.ProjectRoles.AnyAsync(pr => pr.ProjectId == projectId && pr.Id != role.Id && pr.RoleName.ToLower() == request.RoleName.Trim().ToLower());
        if (roleExists) return BadRequest(new { success = false, message = "A role with this name already exists." });

        role.RoleName = request.RoleName.Trim();
        role.CanAddEditMembers = request.CanAddEditMembers;
        role.CanEditProjectSettings = request.CanEditProjectSettings;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            role = new
            {
                role.Id,
                role.RoleName,
                role.CanAddEditMembers,
                role.CanEditProjectSettings,
                role.IsOwner
            }
        });
    }

    [HttpDelete("{roleId}")]
    public async Task<IActionResult> DeleteProjectRole(int projectId, int roleId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var currentMember = await _context.ProjectMembers
            .Include(pm => pm.ProjectRole)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (currentMember?.ProjectRole?.CanAddEditMembers != true) return Forbid();

        var role = await _context.ProjectRoles.FirstOrDefaultAsync(r => r.Id == roleId && r.ProjectId == projectId && !r.IsOwner);
        if (role == null) return NotFound();

        var isRoleInUse = await _context.ProjectMembers.AnyAsync(pm => pm.ProjectRoleId == roleId);
        if (isRoleInUse) return BadRequest(new { success = false, message = "This role is still assigned to members." });

        _context.ProjectRoles.Remove(role);
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }
}