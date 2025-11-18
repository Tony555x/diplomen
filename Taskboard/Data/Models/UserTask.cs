using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class UserTask
    {
        [Required]
        public string UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required]
        public int TaskItemId { get; set; }

        [ForeignKey(nameof(TaskItemId))]
        public TaskItem? TaskItem { get; set; }

        [Required]
        public string Role { get; set; } = String.Empty;

        [Required]
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}
