using System.Collections.Generic;

namespace Taskboard.Data.Models
{
    public class Workspace
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public string OwnerId { get; set; }
        public User Owner { get; set; }

        public ICollection<Project> Projects { get; set; }
        public ICollection<WorkspaceMember> Members { get; set; }
    }
}