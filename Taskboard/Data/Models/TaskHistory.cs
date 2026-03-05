using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class TaskHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TaskId { get; set; }
        [ForeignKey(nameof(TaskId))]
        public TaskItem? Task { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;
        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required]
        [MaxLength(ModelConstants.TaskHistory.ActionTypeMaxLength)]
        public string ActionType { get; set; } = string.Empty; // "Moved", "Completed", "Assigned", etc.

        [MaxLength(ModelConstants.TaskHistory.DetailsMaxLength)]
        public string? Details { get; set; } // e.g., "to Done", "John Doe", etc.

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
