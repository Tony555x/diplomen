using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public class TaskBlocker
    {
        [Required]
        public int BlockingTaskId { get; set; }
        
        [ForeignKey(nameof(BlockingTaskId))]
        public TaskItem? BlockingTask { get; set; }

        [Required]
        public int BlockedTaskId { get; set; }
        
        [ForeignKey(nameof(BlockedTaskId))]
        public TaskItem? BlockedTask { get; set; }
    }
}
