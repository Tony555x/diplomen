using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts;

public class CreateTaskRequest
{
    [Required]
    [MaxLength(ModelConstants.TaskItem.TitleMaxLength)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(ModelConstants.TaskItem.StatusMaxLength)]
    public string? Status { get; set; }

    public int? TaskTypeId { get; set; }
    public int? CollectionId { get; set; }
}

public class UpdateTaskRequest
{
    [MaxLength(ModelConstants.TaskItem.StatusMaxLength)]
    public string? Status { get; set; }

    [MaxLength(ModelConstants.TaskItem.TitleMaxLength)]
    public string? Title { get; set; }

    public bool? Completed { get; set; }
    public List<FieldValueRequest>? FieldValues { get; set; }
    public int? CollectionId { get; set; }
}

public class FieldValueRequest
{
    public int? Id { get; set; }
    public int TaskFieldId { get; set; }

    [MaxLength(ModelConstants.TaskFieldValue.ValueMaxLength)]
    public string? Value { get; set; }
}

public class AssignUserRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
}

public class SetDueDateRequest
{
    public DateTime? DueDate { get; set; }
}

public class CreateMessageRequest
{
    [Required]
    [MaxLength(ModelConstants.TaskMessage.ContentMaxLength)]
    public string Content { get; set; } = string.Empty;
}

public class AddBlockerRequest
{
    [Required]
    public int BlockerTaskId { get; set; }
}
