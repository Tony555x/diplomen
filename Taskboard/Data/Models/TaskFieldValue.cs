using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class TaskFieldValue
    {
        [Key]
        [Required]
        public int Id { get; set; }
        
        [Required]
        public int TaskId { get; set; }
        
        [ForeignKey(nameof(TaskId))]
        public TaskItem? Task { get; set; }
        
        [Required]
        public int TaskFieldId { get; set; }
        
        [ForeignKey(nameof(TaskFieldId))]
        public TaskField? TaskField { get; set; }
        
        // Store the value as string - will be parsed based on field type
        public string? Value { get; set; }
    }
}
