using System.ComponentModel.DataAnnotations;
using Taskboard.Data.Models;

namespace Taskboard.Contracts.Projects;

public class CreateWidgetDto
{
    [Required]
    [MaxLength(ModelConstants.DashboardWidget.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public WidgetType Type { get; set; } = WidgetType.ListResult;

    [MaxLength(ModelConstants.DashboardWidget.SourceMaxLength)]
    public string Source { get; set; } = string.Empty;
}
