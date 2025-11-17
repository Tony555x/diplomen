namespace Taskboard.Data.Models
{
    public class WorkspaceMember
    {
        public int WorkspaceId { get; set; }
        public Workspace Workspace { get; set; }

        public string UserId { get; set; }
        public User User { get; set; }

        public string Role { get; set; }              // optional, safe to remove
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}