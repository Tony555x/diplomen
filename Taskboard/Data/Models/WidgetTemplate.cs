using System.ComponentModel.DataAnnotations;

namespace Taskboard.Data.Models
{
    /// <summary>
    /// A project-agnostic, seeded template widget that users can add to their dashboard.
    /// </summary>
    public class WidgetTemplate
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(300)]
        public string Description { get; set; } = string.Empty;

        /// <summary>"Tasks" or "Members"</summary>
        [Required]
        [MaxLength(20)]
        public string Category { get; set; } = "Tasks";

        /// <summary>Default query JSON for this template (WidgetQueryDto serialized).</summary>
        [Required]
        public string QueryJson { get; set; } = "{}";
    }
}
