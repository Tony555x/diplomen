using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts;

public class CreateTaskRequest
{
    [Required(ErrorMessage = "Task title is required.")]
    [MaxLength(ModelConstants.TaskItem.TitleMaxLength, ErrorMessage = "Task title cannot exceed {1} characters.")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(ModelConstants.TaskItem.StatusMaxLength, ErrorMessage = "Status cannot exceed {1} characters.")]
    public string? Status { get; set; }

    public int? TaskTypeId { get; set; }
    public int? CollectionId { get; set; }
}

public class UpdateTaskRequest
{
    [MaxLength(ModelConstants.TaskItem.StatusMaxLength, ErrorMessage = "Status cannot exceed {1} characters.")]
    public string? Status { get; set; }

    [MaxLength(ModelConstants.TaskItem.TitleMaxLength, ErrorMessage = "Task title cannot exceed {1} characters.")]
    public string? Title { get; set; }

    public bool? Completed { get; set; }
    public List<FieldValueRequest>? FieldValues { get; set; }
    public int? CollectionId { get; set; }
}

public class FieldValueRequest
{
    public int? Id { get; set; }
    public int TaskFieldId { get; set; }

    [MaxLength(ModelConstants.TaskFieldValue.ValueMaxLength, ErrorMessage = "Field value cannot exceed {1} characters.")]
    public string? Value { get; set; }
}

public class AssignUserRequest
{
    [Required(ErrorMessage = "User ID is required.")]
    public string UserId { get; set; } = string.Empty;
}

public class SetDueDateRequest
{
    public DateTime? DueDate { get; set; }
}

public class CreateMessageRequest
{
    [Required(ErrorMessage = "Message content is required.")]
    [MaxLength(ModelConstants.TaskMessage.ContentMaxLength, ErrorMessage = "Message content cannot exceed {1} characters.")]
    public string Content { get; set; } = string.Empty;
}

public class AddBlockerRequest
{
    [Required(ErrorMessage = "Blocker task ID is required.")]
    public int BlockerTaskId { get; set; }
}
