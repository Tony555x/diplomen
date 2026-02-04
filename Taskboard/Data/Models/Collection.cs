using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class Collection
    {
        [Key]
        [Required]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int ProjectId { get; set; }
        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }

        // UNUSED: Status is deprecated. Collections are now column-agnostic and appear in all columns.
        // Kept for backward compatibility with existing database schema.
        [Required]
        public string Status { get; set; } = "To Do";

        // For nested collections
        public int? ParentCollectionId { get; set; }
        [ForeignKey(nameof(ParentCollectionId))]
        public Collection? ParentCollection { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public List<Collection> ChildCollections { get; set; } = new();
        public List<TaskItem> Tasks { get; set; } = new();
    }
}
