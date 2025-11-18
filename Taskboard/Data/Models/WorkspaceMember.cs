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
        public string UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }


        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = String.Empty;


        [Required]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
