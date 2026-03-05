using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class ProjectRole
    {
        [Required]
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }

        [Required]
        [MaxLength(ModelConstants.ProjectRole.RoleNameMaxLength)]
        public string RoleName { get; set; } = string.Empty;

        [Required]
        public bool CanAddEditMembers { get; set; } = false;

        [Required]
        public bool CanEditProjectSettings { get; set; } = false;

        [Required]
        public bool CanCreateEditDeleteTasks { get; set; } = false;

        [Required]
        public bool CanCreateDeleteTaskStatuses { get; set; } = false;

        [Required]
        public bool IsOwner { get; set; } = false;

        public List<ProjectMember> Members { get; set; } = new();
    }
}
