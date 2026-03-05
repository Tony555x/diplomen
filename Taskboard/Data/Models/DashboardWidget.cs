using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public enum WidgetType
    {
        ListResult,
        StatResult,
        Counter
    }

    public class DashboardWidget
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(ModelConstants.DashboardWidget.NameMaxLength)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [Required]
        public WidgetType Type { get; set; }

        [Required]
        public int ProjectId { get; set; }
        [ForeignKey("ProjectId")]
        public virtual Project Project { get; set; } = null!;

        [MaxLength(ModelConstants.DashboardWidget.SourceMaxLength)]
        public string Source { get; set; } = string.Empty;

        [MaxLength(ModelConstants.DashboardWidget.ResultMaxLength)]
        public string Result { get; set; } = string.Empty;
    }
}
