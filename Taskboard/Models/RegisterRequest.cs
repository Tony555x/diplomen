using System.ComponentModel.DataAnnotations;

namespace Taskboard.Models
{
    public class RegisterRequest
    {
        [Required]
        public string Username { get; set; }
        [Required]
        public string Password { get; set; }
    }

}