using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class Workspace
    {
        [Required]
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(ModelConstants.Workspace.NameMaxLength)]
        public string Name { get; set; } = string.Empty;

        public List<Project> Projects { get; set; } = new();
        public List<WorkspaceMember> Members { get; set; } = new();
    }
}