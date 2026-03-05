using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class WorkspaceMember
    {
        [Required]
        public int WorkspaceId { get; set; }

        [ForeignKey(nameof(WorkspaceId))]
        public Workspace? Workspace { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required]
        [MaxLength(ModelConstants.WorkspaceMember.RoleMaxLength)]
        public string Role { get; set; } = string.Empty;

        [Required]
        [MaxLength(ModelConstants.WorkspaceMember.StatusMaxLength)]
        public string Status { get; set; } = "Active";

        [Required]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastVisitedAt { get; set; }
    }
}
