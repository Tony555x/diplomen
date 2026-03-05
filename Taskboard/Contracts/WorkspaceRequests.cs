using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts;

public class CreateWorkspaceRequest
{
    [Required]
    [MaxLength(ModelConstants.Workspace.NameMaxLength)]
    public string Name { get; set; } = string.Empty;
}

public class AddWorkspaceMemberRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
