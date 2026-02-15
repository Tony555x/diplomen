using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class ProjectMember
    {
        [Required]
        public int ProjectId { get; set; }
        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }
        [Required]
        public string UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }
        [Required]
        public int ProjectRoleId { get; set; }
        
        [ForeignKey(nameof(ProjectRoleId))]
        public ProjectRole? ProjectRole { get; set; }
        [Required]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        public ProjectMemberStatus Status { get; set; } = ProjectMemberStatus.Active;
    }
}