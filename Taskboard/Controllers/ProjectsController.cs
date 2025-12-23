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

            // Create default roles for the project
            var ownerRole = new ProjectRole
            {
                ProjectId = project.Id,
                RoleName = "Owner",
                CanAddEditMembers = true,
                CanEditProjectSettings = true,
                IsOwner = true
            };

            var memberRole = new ProjectRole
            {
                ProjectId = project.Id,
                RoleName = "Member",
                CanAddEditMembers = false,
                CanEditProjectSettings = false,
                IsOwner = false
            };

            _context.ProjectRoles.Add(ownerRole);
            _context.ProjectRoles.Add(memberRole);
            await _context.SaveChangesAsync();

            // Add creator as owner
            var creatorMembership = new ProjectMember
            {
                ProjectId = project.Id,
                UserId = userId,
                ProjectRoleId = ownerRole.Id,
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
                    ProjectRoleId = memberRole.Id,
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

        [HttpGet("{projectId}/members")]
        public async Task<IActionResult> GetProjectMembersAndRoles(int projectId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user is a member of the project and get their role
            var currentUserMembership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (currentUserMembership == null)
            {
                return Forbid();
            }

            // Fetch all members with user details
            var members = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Include(pm => pm.User)
                .Include(pm => pm.ProjectRole)
                .Select(pm => new
                {
                    pm.UserId,
                    pm.User!.Email,
                    pm.User.UserName,
                    Role = pm.ProjectRole!.RoleName,
                    pm.JoinedAt
                })
                .OrderBy(m => m.JoinedAt)
                .ToListAsync();

            // Fetch all roles for this project
            var roles = await _context.ProjectRoles
                .Where(pr => pr.ProjectId == projectId)
                .Select(pr => new
                {
                    pr.Id,
                    pr.RoleName,
                    pr.CanAddEditMembers,
                    pr.CanEditProjectSettings,
                    pr.IsOwner,
                    MemberCount = pr.Members.Count
                })
                .OrderByDescending(r => r.IsOwner)
                .ThenBy(r => r.RoleName)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                members = members,
                roles = roles,
                currentUserRole = new
                {
                    RoleName = currentUserMembership.ProjectRole!.RoleName,
                    CanAddEditMembers = currentUserMembership.ProjectRole.CanAddEditMembers,
                    CanEditProjectSettings = currentUserMembership.ProjectRole.CanEditProjectSettings,
                    IsOwner = currentUserMembership.ProjectRole.IsOwner
                }
            });
        }

        [HttpPost("{projectId}/members")]
        public async Task<IActionResult> AddProjectMember(int projectId, [FromBody] AddMemberRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Verify user is a member of the project
            var isMember = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!isMember)
            {
                return Forbid();
            }
            var currentUserProjectMember = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (currentUserProjectMember == null || currentUserProjectMember.ProjectRole == null || !currentUserProjectMember.ProjectRole.CanAddEditMembers)
            {
                return Forbid();
            }

            
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Email is required." });
            }

            if (request.RoleId <= 0)
            {
                return BadRequest(new { success = false, message = "Role is required." });
            }

            // Find user by email
            var userToAdd = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (userToAdd == null)
            {
                return NotFound(new { success = false, message = "User with this email not found." });
            }

            // Check if user is already a member
            var existingMembership = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userToAdd.Id);

            if (existingMembership)
            {
                return BadRequest(new { success = false, message = "User is already a member of this project." });
            }

            // Verify the role exists and belongs to this project
            var role = await _context.ProjectRoles
                .FirstOrDefaultAsync(pr => pr.Id == request.RoleId && pr.ProjectId == projectId);

            if (role == null)
            {
                return BadRequest(new { success = false, message = "Invalid role selected." });
            }

            // Add member
            var newMember = new ProjectMember
            {
                ProjectId = projectId,
                UserId = userToAdd.Id,
                ProjectRoleId = role.Id,
                JoinedAt = DateTime.UtcNow
            };

            _context.ProjectMembers.Add(newMember);
            await _context.SaveChangesAsync();

            // Reload with role information
            var addedMember = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && pm.UserId == userToAdd.Id)
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                success = true,
                message = "Member added successfully.",
                member = new
                {
                    UserId = userToAdd.Id,
                    userToAdd.Email,
                    userToAdd.UserName,
                    Role = addedMember!.ProjectRole!.RoleName,
                    addedMember.JoinedAt
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

        [HttpGet("{projectId}/task-types")]
        public async Task<IActionResult> GetProjectTaskTypes(int projectId)
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

            var taskTypes = await _context.TaskTypes
                .Where(tt => tt.ProjectId == projectId)
                .Include(tt => tt.Fields)
                .Select(tt => new
                {
                    tt.Id,
                    tt.Name,
                    tt.Description,
                    Fields = tt.Fields.OrderBy(f => f.Order).Select(f => new
                    {
                        f.Id,
                        f.Name,
                        f.Description,
                        Type = f.Type.ToString(),
                        f.IsRequired,
                        f.Options,
                        f.DefaultValue,
                        f.Order
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                taskTypes = taskTypes
            });
        }
        [HttpPatch("{projectId}")]
        public async Task<IActionResult> UpdateProject(
            int projectId,
            [FromBody] UpdateProjectRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
                return Unauthorized();

            // Verify membership and load role
            var membership = await _context.ProjectMembers
                .Include(pm => pm.ProjectRole)
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == projectId &&
                    pm.UserId == userId);

            if (membership == null)
                return Forbid();

            if (membership.ProjectRole == null ||
                !membership.ProjectRole.CanEditProjectSettings)
            {
                return Forbid();
            }

            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
                return NotFound();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Project name is required."
                });
            }

            project.Name = request.Name.Trim();
            project.AccessLevel = request.AccessLevel;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                project = new
                {
                    project.Id,
                    project.Name,
                    project.AccessLevel
                }
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

    public class AddMemberRequest
    {
        public string Email { get; set; } = string.Empty;
        public int RoleId { get; set; }
    }
    public class UpdateProjectRequest
    {
        public string Name { get; set; } = string.Empty;
        public ProjectAccessLevel AccessLevel { get; set; }
    }

}
