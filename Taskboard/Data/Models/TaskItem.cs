using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class TaskItem
    {
        [Key]
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(ModelConstants.TaskItem.TitleMaxLength)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public bool Completed { get; set; }

        [Required]
        [MaxLength(ModelConstants.TaskItem.StatusMaxLength)]
        public string Status { get; set; } = "To Do";

        [Required]
        public int ProjectId { get; set; }
        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }

        // Task Type relationship (nullable to support tasks without types)
        public int? TaskTypeId { get; set; }
        [ForeignKey(nameof(TaskTypeId))]
        public TaskType? TaskType { get; set; }

        public List<UserTask> UserTasks { get; set; } = new();
        public List<TaskFieldValue> FieldValues { get; set; } = new();

        public DateTime? DueDate { get; set; }

        // Collection relationship (nullable - tasks can be at root level)
        public int? CollectionId { get; set; }
        [ForeignKey(nameof(CollectionId))]
        public Collection? Collection { get; set; }

        public int? ParentTaskId { get; set; }
        [ForeignKey(nameof(ParentTaskId))]
        public TaskItem? ParentTask { get; set; }

        [InverseProperty(nameof(ParentTask))]
        public List<TaskItem> Subtasks { get; set; } = new();

        // Soft-delete / archiving
        public bool IsArchived { get; set; } = false;
        public DateTime? ArchivedAt { get; set; }
    }
}