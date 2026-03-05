using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public enum ProjectAccessLevel
    {
        Public,
        Workspace,
        Private
    }

    public class Project
    {
        [Required]
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(ModelConstants.Project.NameMaxLength)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int WorkspaceId { get; set; }
        [ForeignKey(nameof(WorkspaceId))]
        public Workspace? Workspace { get; set; }

        [Required]
        public ProjectAccessLevel AccessLevel { get; set; } = ProjectAccessLevel.Workspace;

        public List<TaskItem> Tasks { get; set; } = new();
        public List<ProjectMember> Members { get; set; } = new();
        public List<ProjectRole> Roles { get; set; } = new();
        public List<TaskType> TaskTypes { get; set; } = new();
        public List<UserTaskStatus> UserTaskStatuses { get; set; } = new();
    }
}