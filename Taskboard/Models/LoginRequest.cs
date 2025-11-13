using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace Taskboard.Models
{
    public class LoginRequest
    {
        [Required]
        public string Username { get; set; }
        [Required]
        public string Password { get; set; }
    }

}