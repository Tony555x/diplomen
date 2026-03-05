using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Taskboard.Data.Models
{
    public enum FieldType
    {
        Text,
        Number,
        Date,
        Checkbox,
        Select,      // unused
        MultiSelect  // unused
    }

    public class TaskField
    {
        [Key]
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(ModelConstants.TaskField.NameMaxLength)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(ModelConstants.TaskField.DescriptionMaxLength)]
        public string? Description { get; set; }

        [Required]
        public FieldType Type { get; set; } = FieldType.Text;

        [Required]
        public bool IsRequired { get; set; } = false;

        // For Select and MultiSelect types - JSON array of options
        [MaxLength(ModelConstants.TaskField.OptionsMaxLength)]
        public string? Options { get; set; }

        // Default value for the field
        [MaxLength(ModelConstants.TaskField.DefaultValueMaxLength)]
        public string? DefaultValue { get; set; }

        // Display order
        [Required]
        public int Order { get; set; } = 0;

        [Required]
        public int TaskTypeId { get; set; }

        [ForeignKey(nameof(TaskTypeId))]
        public TaskType? TaskType { get; set; }

        // Navigation properties
        public List<TaskFieldValue> FieldValues { get; set; } = new();
    }
}
