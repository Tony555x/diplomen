using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace Taskboard.Data.Models
{
    public class User : IdentityUser
    {
        public ICollection<TaskItem> Tasks { get; set; }
        public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; }
        public ICollection<ProjectMember> ProjectMemberships { get; set; }
    }
}