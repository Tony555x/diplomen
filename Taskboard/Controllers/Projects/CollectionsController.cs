using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskboard.Data.Models;

namespace Taskboard.Controllers.Projects
{
    [Authorize]
    [Route("api/projects/{projectId}/collections")]
    [ApiController]
    public class CollectionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CollectionsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCollections(int projectId)
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

            var collections = await _context.Collections
                .Where(c => c.ProjectId == projectId)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.ParentCollectionId,
                    c.CreatedAt
                })
                .ToListAsync();

            return Ok(collections);
        }

        [HttpPost]
        public async Task<IActionResult> CreateCollection(int projectId, [FromBody] CreateCollectionRequest request)
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

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { success = false, message = "Collection name is required." });
            }

            // If parentCollectionId is provided, verify it exists and belongs to the same project
            if (request.ParentCollectionId.HasValue)
            {
                var parentExists = await _context.Collections
                    .AnyAsync(c => c.Id == request.ParentCollectionId.Value && c.ProjectId == projectId);

                if (!parentExists)
                {
                    return BadRequest(new { success = false, message = "Parent collection not found." });
                }
            }

            var collection = new Collection
            {
                Name = request.Name.Trim(),
                ProjectId = projectId,
                ParentCollectionId = request.ParentCollectionId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Collections.Add(collection);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                collection = new
                {
                    collection.Id,
                    collection.Name,
                    collection.ParentCollectionId,
                    collection.CreatedAt
                }
            });
        }

        [HttpPatch("{collectionId}")]
        public async Task<IActionResult> UpdateCollection(int projectId, int collectionId, [FromBody] UpdateCollectionRequest request)
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

            var collection = await _context.Collections
                .FirstOrDefaultAsync(c => c.Id == collectionId && c.ProjectId == projectId);

            if (collection == null)
            {
                return NotFound(new { success = false, message = "Collection not found." });
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                collection.Name = request.Name.Trim();
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                collection = new
                {
                    collection.Id,
                    collection.Name,
                    collection.ParentCollectionId
                }
            });
        }

        [HttpDelete("{collectionId}")]
        public async Task<IActionResult> DeleteCollection(int projectId, int collectionId)
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

            var collection = await _context.Collections
                .Include(c => c.ChildCollections)
                .Include(c => c.Tasks)
                .FirstOrDefaultAsync(c => c.Id == collectionId && c.ProjectId == projectId);

            if (collection == null)
            {
                return NotFound(new { success = false, message = "Collection not found." });
            }

            // Check if collection has child collections
            if (collection.ChildCollections.Any())
            {
                return BadRequest(new { success = false, message = "Cannot delete collection with child collections. Delete or move child collections first." });
            }

            // Manually set tasks' CollectionId to null (move to root)
            // This is required because we use Restrict cascade to avoid cascade path conflicts
            foreach (var task in collection.Tasks)
            {
                task.CollectionId = null;
            }

            _context.Collections.Remove(collection);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                collectionId = collectionId
            });
        }
    }

    public class CreateCollectionRequest
    {
        public string Name { get; set; } = string.Empty;
        public int? ParentCollectionId { get; set; }
    }

    public class UpdateCollectionRequest
    {
        public string? Name { get; set; }
    }
}
