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
        public string Name { get; set; } = String.Empty;
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
    }
}