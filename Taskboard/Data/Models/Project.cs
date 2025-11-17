using System.Collections.Generic;

namespace Taskboard.Data.Models
{
    public class Project
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public int WorkspaceId { get; set; }
        public Workspace Workspace { get; set; }

        public string OwnerId { get; set; }
        public User Owner { get; set; }

        public ICollection<TaskItem> Tasks { get; set; }
        public ICollection<ProjectMember> Members { get; set; }
    }
}