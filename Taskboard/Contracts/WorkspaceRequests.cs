using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts;

public class CreateWorkspaceRequest
{
    [Required(ErrorMessage = "Workspace name is required.")]
    [MaxLength(ModelConstants.Workspace.NameMaxLength, ErrorMessage = "Workspace name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;
}

public class AddWorkspaceMemberRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;
}
