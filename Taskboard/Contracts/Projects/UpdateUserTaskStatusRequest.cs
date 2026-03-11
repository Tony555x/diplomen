using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects
{
    public class UpdateUserTaskStatusRequest
    {
        [Required(ErrorMessage = "Status name is required.")]
        [MaxLength(ModelConstants.TaskItem.StatusMaxLength, ErrorMessage = "Status name cannot exceed {1} characters.")]
        public string Name { get; set; } = string.Empty;

        public string? Color { get; set; }
        public bool AutoComplete { get; set; } = false;
    }
}
