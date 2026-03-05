using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects;

public class CreateCollectionRequest
{
    [Required]
    [MaxLength(ModelConstants.Collection.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    public int? ParentCollectionId { get; set; }
}

public class UpdateCollectionRequest
{
    [MaxLength(ModelConstants.Collection.NameMaxLength)]
    public string? Name { get; set; }
}
