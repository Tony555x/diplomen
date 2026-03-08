using System.ComponentModel.DataAnnotations;

namespace Taskboard.Contracts
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Username is required.")]
        [MaxLength(256, ErrorMessage = "Username cannot exceed {1} characters.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [MaxLength(256, ErrorMessage = "Password cannot exceed {1} characters.")]
        public string Password { get; set; } = string.Empty;
    }
}