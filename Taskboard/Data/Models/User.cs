using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace Taskboard.Data.Models
{
    public class User : IdentityUser
    {
        public List<TaskItem> Tasks { get; set; } = new();
        public List<WorkspaceMember> WorkspaceMemberships { get; set; } = new();
        public List<ProjectMember> ProjectMemberships { get; set; } = new();
        public string? AvatarColor { get; set; }
    }
}