using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Taskboard.Contracts;
using Taskboard.Data.Models;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Taskboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _config;

        public AuthController(UserManager<User> userManager, IConfiguration config)
        {
            _userManager = userManager;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Check if email already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Registration failed",
                    errors = new[] { "Email is already registered." }
                });
            }

            var avatarColors = new[]
            {
                "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
                "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
            };
            var avatarColor = avatarColors[Random.Shared.Next(avatarColors.Length)];

            var user = new User { UserName = request.Username, Email = request.Email, AvatarColor = avatarColor };
            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Registration failed",
                    errors = result.Errors.Select(e => e.Description)
                });
            }

            try
            {
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                var verifyUrl = Url.Action("VerifyEmail", "Auth", new { userId = user.Id, token = token }, Request.Scheme);
                
                var gmailUser = _config["GMAIL_EMAIL"];
                var clientId = _config["GMAIL_CLIENT_ID"];
                var clientSecret = _config["GMAIL_CLIENT_SECRET"];
                var refreshToken = _config["GMAIL_REFRESH_TOKEN"];

                if (!string.IsNullOrEmpty(gmailUser) && !string.IsNullOrEmpty(clientId) && 
                    !string.IsNullOrEmpty(clientSecret) && !string.IsNullOrEmpty(refreshToken))
                {
                    // Get access token using refresh token
                    var clientSecrets = new ClientSecrets { ClientId = clientId, ClientSecret = clientSecret };
                    var credential = new UserCredential(
                        new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer { ClientSecrets = clientSecrets }),
                        "user", 
                        new TokenResponse { RefreshToken = refreshToken }
                    );

                    await credential.RefreshTokenAsync(CancellationToken.None);
                    var accessToken = credential.Token.AccessToken;

                    var message = new MimeMessage();
                    message.From.Add(new MailboxAddress("Taskboard", gmailUser));
                    message.To.Add(new MailboxAddress(user.UserName, user.Email));
                    message.Subject = "Verify your Taskboard account";

                    var bodyBuilder = new BodyBuilder
                    {
                        HtmlBody = $"<p>Hi {user.UserName},</p><p>Please verify your email by clicking the link below:</p><p><a href='{verifyUrl}'>Verify Email</a></p>"
                    };
                    message.Body = bodyBuilder.ToMessageBody();

                    using var client = new SmtpClient();
                    // Fix for SSL revocation error
                    client.CheckCertificateRevocation = false;
                    
                    await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
                    
                    var oauth2 = new SaslMechanismOAuth2(gmailUser, accessToken);
                    await client.AuthenticateAsync(oauth2);

                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                }
                else
                {
                    throw new Exception("Gmail configuration is missing in .env");
                }
            }
            catch (Exception ex)
            {
                // Roll back user creation if email fails
                await _userManager.DeleteAsync(user);
                
                return BadRequest(new
                {
                    success = false,
                    message = "Registration failed: Could not send verification email.",
                    errors = new[] { ex.Message }
                });
            }

            return Ok(new
            {
                success = true,
                message = "User created successfully. Please check your email to verify your account.",
                errors = Array.Empty<string>()
            });
        }


        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.UsernameOrEmail) 
                       ?? await _userManager.FindByNameAsync(request.UsernameOrEmail);
            
            if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid username or password",
                    errors = new string[] { "Invalid username or password" }
                });
            }

            if (!user.EmailConfirmed)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Email is not verified. Please check your inbox.",
                    errors = new string[] { "Email is not verified." }
                });
            }

            var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.UserName ?? ""),
                    new Claim(ClaimTypes.Email, user.Email ?? "")
                }),
                Expires = DateTime.UtcNow.AddHours(1),
                Issuer = _config["Jwt:Issuer"],
                Audience = _config["Jwt:Issuer"],
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new
            {
                success = true,
                message = "Login successful",
                token = tokenHandler.WriteToken(token),
                errors = new string[] { }
            });
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string userId, [FromQuery] string token)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                return BadRequest("Invalid configuration.");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return BadRequest("Invalid user.");
            }

            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (result.Succeeded)
            {
                return Redirect("/verify-email-success");
            }

            return BadRequest("Error confirming your email.");
        }

    }
}
