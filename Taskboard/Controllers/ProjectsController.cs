using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;

namespace Taskboard.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProjectsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { success = false, message = "Project name is required." });
            }

            // Verify user is a member of the workspace
            var isMember = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == request.WorkspaceId && wm.UserId == userId);

            if (!isMember)
            {
                return Forbid();
            }

            // Validate all member emails exist
            var memberEmails = request.MemberEmails ?? new List<string>();
            var validatedMembers = new List<User>();

            foreach (var email in memberEmails)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = $"User with email '{email}' not found." });
                }
                validatedMembers.Add(user);
            }

            // Create project
            var project = new Project
            {
                Name = request.Name.Trim(),
                WorkspaceId = request.WorkspaceId,
                AccessLevel = request.AccessLevel
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Add creator as owner
            var creatorMembership = new ProjectMember
            {
                ProjectId = project.Id,
                UserId = userId,
                Role = "Owner",
                JoinedAt = DateTime.UtcNow
            };

            _context.ProjectMembers.Add(creatorMembership);

            // Add all listed members
            foreach (var member in validatedMembers)
            {
                // Skip if member is already the creator
                if (member.Id == userId) continue;

                var membership = new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = member.Id,
                    Role = "Member",
                    JoinedAt = DateTime.UtcNow
                };

                _context.ProjectMembers.Add(membership);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Project created successfully.",
                project = new
                {
                    project.Id,
                    project.Name,
                    project.AccessLevel
                }
            });
        }

        [HttpPost("validate-email")]
        public async Task<IActionResult> ValidateEmail([FromBody] ValidateEmailRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Email is required." });
            }

            var user = await _context.Users
                .Where(u => u.Email == request.Email)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.UserName
                })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound(new { success = false, message = "User with this email not found." });
            }

            return Ok(new
            {
                success = true,
                user = user
            });
        }
    }

    public class CreateProjectRequest
    {
        public string Name { get; set; } = string.Empty;
        public int WorkspaceId { get; set; }
        public ProjectAccessLevel AccessLevel { get; set; } = ProjectAccessLevel.Workspace;
        public List<string>? MemberEmails { get; set; }
    }

    public class ValidateEmailRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
