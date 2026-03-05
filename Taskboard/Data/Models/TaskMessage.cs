using System;
using System.ComponentModel.DataAnnotations;

namespace Taskboard.Data.Models
{
    public class TaskMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TaskItemId { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(ModelConstants.TaskMessage.ContentMaxLength)]
        public string Content { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public TaskItem Task { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
