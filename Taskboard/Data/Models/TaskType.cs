using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class TaskType
    {
        [Key]
        [Required]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = String.Empty;
        
        public string? Description { get; set; }

        public string? Icon { get; set; }

        [Required]
        public int ProjectId { get; set; }
        
        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }
        
        // Navigation properties
        public List<TaskField> Fields { get; set; } = new();
        public List<TaskItem> Tasks { get; set; } = new();
    }
}
