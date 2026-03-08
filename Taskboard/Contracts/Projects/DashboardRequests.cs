using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects;

public class CreateWidgetDto
{
    [Required(ErrorMessage = "Widget name is required.")]
    [MaxLength(ModelConstants.DashboardWidget.NameMaxLength, ErrorMessage = "Widget name cannot exceed {1} characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Widget type is required.")]
    public WidgetType Type { get; set; } = WidgetType.ListResult;

    [MaxLength(ModelConstants.DashboardWidget.SourceMaxLength, ErrorMessage = "Widget source cannot exceed {1} characters.")]
    public string Source { get; set; } = string.Empty;
}
