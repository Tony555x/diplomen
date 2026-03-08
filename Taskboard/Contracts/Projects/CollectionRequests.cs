using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects;

public class CreateCollectionRequest
{
    [Required(ErrorMessage = "Collection name is required.")]
    [MaxLength(ModelConstants.Collection.NameMaxLength, ErrorMessage = "Collection name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;

    public int? ParentCollectionId { get; set; }
}

public class UpdateCollectionRequest
{
    [MaxLength(ModelConstants.Collection.NameMaxLength, ErrorMessage = "Collection name cannot exceed {1} characters.")]
    public string? Name { get; set; }
}
