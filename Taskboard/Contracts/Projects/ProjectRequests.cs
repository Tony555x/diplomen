using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects;

public class CreateProjectRequest
{
    [Required]
    [MaxLength(ModelConstants.Project.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int WorkspaceId { get; set; }

    public ProjectAccessLevel AccessLevel { get; set; } = ProjectAccessLevel.Workspace;

    public List<string>? MemberEmails { get; set; }
}

public class UpdateProjectRequest
{
    [Required]
    [MaxLength(ModelConstants.Project.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    public ProjectAccessLevel AccessLevel { get; set; }
}

public class ValidateEmailRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class AddMemberRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public int RoleId { get; set; }
}

public class UpdateMemberRequest
{
    [Required]
    public int RoleId { get; set; }
}

public class CreateProjectRoleRequest
{
    public int? RoleId { get; set; }

    [Required]
    [MaxLength(ModelConstants.ProjectRole.RoleNameMaxLength)]
    public string RoleName { get; set; } = string.Empty;

    public bool CanAddEditMembers { get; set; }
    public bool CanEditProjectSettings { get; set; }
    public bool CanCreateEditDeleteTasks { get; set; }
    public bool CanCreateDeleteTaskStatuses { get; set; }
}

public class UpsertTaskTypeRequest
{
    public int? Id { get; set; }

    [Required]
    [MaxLength(ModelConstants.TaskType.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(ModelConstants.TaskType.DescriptionMaxLength)]
    public string? Description { get; set; }

    [MaxLength(ModelConstants.TaskType.IconMaxLength)]
    public string? Icon { get; set; }

    [Required]
    public List<UpsertTaskFieldRequest> Fields { get; set; } = new();
}

public class UpsertTaskFieldRequest
{
    public int? Id { get; set; }

    [Required]
    [MaxLength(ModelConstants.TaskField.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public FieldType Type { get; set; }

    public bool IsRequired { get; set; }

    [MaxLength(ModelConstants.TaskField.OptionsMaxLength)]
    public string? Options { get; set; }

    [MaxLength(ModelConstants.TaskField.DefaultValueMaxLength)]
    public string? DefaultValue { get; set; }

    public int Order { get; set; }
}

public class CreateUserTaskStatusRequest
{
    [Required]
    [MaxLength(ModelConstants.TaskItem.StatusMaxLength)]
    public string Name { get; set; } = string.Empty;
}