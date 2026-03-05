using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;
        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required]
        public NotificationType Type { get; set; }

        [Required]
        [MaxLength(ModelConstants.Notification.TitleMaxLength)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(ModelConstants.Notification.MessageMaxLength)]
        public string Message { get; set; } = string.Empty;

        // ID of the related entity (e.g., ProjectId or TaskId)
        public int? RelatedEntityId { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
