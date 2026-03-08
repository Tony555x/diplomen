using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects;

public class CreateProjectRequest
{
    [Required(ErrorMessage = "Project name is required.")]
    [MaxLength(ModelConstants.Project.NameMaxLength, ErrorMessage = "Project name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Workspace ID is required.")]
    public int WorkspaceId { get; set; }

    public ProjectAccessLevel AccessLevel { get; set; } = ProjectAccessLevel.Workspace;

    public List<string>? MemberEmails { get; set; }
}

public class UpdateProjectRequest
{
    [Required(ErrorMessage = "Project name is required.")]
    [MaxLength(ModelConstants.Project.NameMaxLength, ErrorMessage = "Project name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;

    public ProjectAccessLevel AccessLevel { get; set; }
}

public class ValidateEmailRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;
}

public class AddMemberRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role ID is required.")]
    public int RoleId { get; set; }
}

public class UpdateMemberRequest
{
    [Required(ErrorMessage = "Role ID is required.")]
    public int RoleId { get; set; }
}

public class CreateProjectRoleRequest
{
    public int? RoleId { get; set; }

    [Required(ErrorMessage = "Role name is required.")]
    [MaxLength(ModelConstants.ProjectRole.RoleNameMaxLength, ErrorMessage = "Role name cannot exceed {1} characters.")]
    public string RoleName { get; set; } = string.Empty;

    public bool CanAddEditMembers { get; set; }
    public bool CanEditProjectSettings { get; set; }
    public bool CanCreateEditDeleteTasks { get; set; }
    public bool CanCreateDeleteTaskStatuses { get; set; }
}

public class UpsertTaskTypeRequest
{
    public int? Id { get; set; }

    [Required(ErrorMessage = "Task type name is required.")]
    [MaxLength(ModelConstants.TaskType.NameMaxLength, ErrorMessage = "Task type name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(ModelConstants.TaskType.DescriptionMaxLength, ErrorMessage = "Task type description cannot exceed {1} characters.")]
    public string? Description { get; set; }

    [MaxLength(ModelConstants.TaskType.IconMaxLength, ErrorMessage = "Task type icon cannot exceed {1} characters.")]
    public string? Icon { get; set; }

    [Required(ErrorMessage = "Task fields are required.")]
    public List<UpsertTaskFieldRequest> Fields { get; set; } = new();
}

public class UpsertTaskFieldRequest
{
    public int? Id { get; set; }

    [Required(ErrorMessage = "Field name is required.")]
    [MaxLength(ModelConstants.TaskField.NameMaxLength, ErrorMessage = "Field name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Field type is required.")]
    public FieldType Type { get; set; }

    public bool IsRequired { get; set; }

    [MaxLength(ModelConstants.TaskField.OptionsMaxLength, ErrorMessage = "Options cannot exceed {1} characters.")]
    public string? Options { get; set; }

    [MaxLength(ModelConstants.TaskField.DefaultValueMaxLength, ErrorMessage = "Default value cannot exceed {1} characters.")]
    public string? DefaultValue { get; set; }

    public int Order { get; set; }
}

public class CreateUserTaskStatusRequest
{
    [Required(ErrorMessage = "Status name is required.")]
    [MaxLength(ModelConstants.TaskItem.StatusMaxLength, ErrorMessage = "Status name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;
}