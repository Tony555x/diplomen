namespace Taskboard.Data.Models
{
    public class ProjectMember
    {
        public int ProjectId { get; set; }
        public Project Project { get; set; }
        public string UserId { get; set; }
        public User User { get; set; }

        public string Role { get; set; }              // optional
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}