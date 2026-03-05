using System.ComponentModel.DataAnnotations;

namespace Taskboard.Contracts
{
    public class LoginRequest
    {
        [Required]
        [MaxLength(256)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string Password { get; set; } = string.Empty;
    }
}