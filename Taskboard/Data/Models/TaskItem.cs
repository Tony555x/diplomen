namespace Taskboard.Data.Models
{
    public class TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public bool Completed { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; }

        public string AssignedToId { get; set; }
        public User AssignedTo { get; set; }
    }
}