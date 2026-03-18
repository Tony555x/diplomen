using System.ComponentModel.DataAnnotations;

namespace Taskboard.Contracts
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Username or Email is required.")]
        [MaxLength(256, ErrorMessage = "Username or Email cannot exceed {1} characters.")]
        public string UsernameOrEmail { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [MaxLength(256, ErrorMessage = "Password cannot exceed {1} characters.")]
        public string Password { get; set; } = string.Empty;
    }
}