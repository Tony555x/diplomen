using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.Extensions.Configuration;
using Moq;
using NUnit.Framework;
using Taskboard.Contracts;
using Taskboard.Controllers;
using Taskboard.Data.Models;
using Taskboard.Services;

namespace Taskboard.Tests.Controllers
{
    [TestFixture]
    public class AuthControllerTests
    {
        private Mock<UserManager<User>> _userManagerMock;
        private Mock<IConfiguration> _configMock;
        private Mock<IEmailService> _emailServiceMock;
        private Mock<IUrlHelper> _urlHelperMock;
        private AuthController _authController;

        [SetUp]
        public void Setup()
        {
            var store = new Mock<IUserStore<User>>();
            _userManagerMock = new Mock<UserManager<User>>(store.Object, null, null, null, null, null, null, null, null);

            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns("ThisIsAVerySecretKeyThatIsAtLeast32BytesLong!");
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns("TestIssuer");

            _emailServiceMock = new Mock<IEmailService>();
            // Default: email sends successfully (no-op)
            _emailServiceMock
                .Setup(e => e.SendVerificationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _authController = new AuthController(_userManagerMock.Object, _configMock.Object, _emailServiceMock.Object);

            _authController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };

            // Mock IUrlHelper so Url.Action() returns a non-null string in Register
            _urlHelperMock = new Mock<IUrlHelper>();
            _urlHelperMock
                .Setup(u => u.Action(It.IsAny<UrlActionContext>()))
                .Returns("https://localhost/api/auth/verify-email?userId=x&token=y");
            _authController.Url = _urlHelperMock.Object;
        }

        // ── Register ──────────────────────────────────────────────────────────────

        [Test]
        public async Task Register_WithExistingEmail_ReturnsBadRequest()
        {
            // Arrange
            var request = new RegisterRequest { Username = "testuser", Email = "existing@test.com", Password = "Password123!" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.Email)).ReturnsAsync(new User { Email = request.Email });

            // Act
            var result = await _authController.Register(request) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
        }

        [Test]
        public async Task Register_WithValidData_SendsEmailAndReturnsOk()
        {
            // Arrange
            var request = new RegisterRequest { Username = "newuser", Email = "new@test.com", Password = "Password123!" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.Email)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), request.Password)).ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(x => x.GenerateEmailConfirmationTokenAsync(It.IsAny<User>())).ReturnsAsync("confirm-token");

            // Act
            var result = await _authController.Register(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.True);

            // Email service must have been called exactly once
            _emailServiceMock.Verify(
                e => e.SendVerificationEmailAsync("new@test.com", "newuser", It.IsAny<string>()),
                Times.Once);
        }

        [Test]
        public async Task Register_WhenEmailFails_DeletesUserAndReturnsBadRequest()
        {
            // Arrange
            var request = new RegisterRequest { Username = "newuser", Email = "fail@test.com", Password = "Password123!" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.Email)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), request.Password)).ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(x => x.GenerateEmailConfirmationTokenAsync(It.IsAny<User>())).ReturnsAsync("confirm-token");
            _userManagerMock.Setup(x => x.DeleteAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);

            _emailServiceMock
                .Setup(e => e.SendVerificationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMTP error"));

            // Act
            var result = await _authController.Register(request) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);

            // User must have been rolled back
            _userManagerMock.Verify(x => x.DeleteAsync(It.IsAny<User>()), Times.Once);
        }

        [Test]
        public async Task Register_WithCreateFailure_ReturnsBadRequest()
        {
            // Arrange
            var request = new RegisterRequest { Username = "newuser", Email = "new@test.com", Password = "Weak" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.Email)).ReturnsAsync((User)null);
            _userManagerMock
                .Setup(x => x.CreateAsync(It.IsAny<User>(), request.Password))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Password too weak" }));

            // Act
            var result = await _authController.Register(request) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
        }

        // ── Login ─────────────────────────────────────────────────────────────────

        [Test]
        public async Task Login_WithInvalidUser_ReturnsUnauthorized()
        {
            // Arrange
            var request = new LoginRequest { UsernameOrEmail = "nonexistent", Password = "password" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.UsernameOrEmail)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.FindByNameAsync(request.UsernameOrEmail)).ReturnsAsync((User)null);

            // Act
            var result = await _authController.Login(request) as UnauthorizedObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(401));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
        }

        [Test]
        public async Task Login_WithWrongPassword_ReturnsUnauthorized()
        {
            // Arrange
            var request = new LoginRequest { UsernameOrEmail = "user", Password = "wrongpassword" };
            var user = new User { UserName = "user" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.UsernameOrEmail)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.FindByNameAsync(request.UsernameOrEmail)).ReturnsAsync(user);
            _userManagerMock.Setup(x => x.CheckPasswordAsync(user, request.Password)).ReturnsAsync(false);

            // Act
            var result = await _authController.Login(request) as UnauthorizedObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(401));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
        }

        [Test]
        public async Task Login_WithUnverifiedEmail_ReturnsUnauthorized()
        {
            // Arrange
            var request = new LoginRequest { UsernameOrEmail = "user", Password = "password" };
            var user = new User { Id = "user1", UserName = "user", Email = "user@test.com", EmailConfirmed = false };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.UsernameOrEmail)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.FindByNameAsync(request.UsernameOrEmail)).ReturnsAsync(user);
            _userManagerMock.Setup(x => x.CheckPasswordAsync(user, request.Password)).ReturnsAsync(true);

            // Act
            var result = await _authController.Login(request) as UnauthorizedObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(401));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
            Assert.That(t.GetProperty("message").GetValue(result.Value, null)?.ToString(), Does.Contain("not verified"));
        }

        [Test]
        public async Task Login_WithValidUsername_ReturnsOkWithToken()
        {
            // Arrange
            var request = new LoginRequest { UsernameOrEmail = "user", Password = "password" };
            var user = new User { Id = "user1", UserName = "user", Email = "user@test.com", EmailConfirmed = true };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.UsernameOrEmail)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.FindByNameAsync(request.UsernameOrEmail)).ReturnsAsync(user);
            _userManagerMock.Setup(x => x.CheckPasswordAsync(user, request.Password)).ReturnsAsync(true);

            // Act
            var result = await _authController.Login(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.True);
            Assert.That(t.GetProperty("token").GetValue(result.Value, null), Is.Not.Null);
        }

        [Test]
        public async Task Login_WithValidEmail_ReturnsOkWithToken()
        {
            // Arrange
            var request = new LoginRequest { UsernameOrEmail = "user@test.com", Password = "password" };
            var user = new User { Id = "user1", UserName = "user", Email = "user@test.com", EmailConfirmed = true };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.UsernameOrEmail)).ReturnsAsync(user);
            _userManagerMock.Setup(x => x.CheckPasswordAsync(user, request.Password)).ReturnsAsync(true);

            // Act
            var result = await _authController.Login(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.True);
            Assert.That(t.GetProperty("token").GetValue(result.Value, null), Is.Not.Null);
        }

        // ── VerifyEmail ───────────────────────────────────────────────────────────

        [Test]
        public async Task VerifyEmail_WithValidToken_RedirectsToSuccessPage()
        {
            // Arrange
            var userId = "user1";
            var token = "valid-confirm-token";
            var user = new User { Id = userId, UserName = "user", Email = "user@test.com" };
            _userManagerMock.Setup(x => x.FindByIdAsync(userId)).ReturnsAsync(user);
            _userManagerMock.Setup(x => x.ConfirmEmailAsync(user, token)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _authController.VerifyEmail(userId, token);

            // Assert — controller does Redirect("/verify-email-success")
            Assert.That(result, Is.InstanceOf<RedirectResult>());
            var redirect = result as RedirectResult;
            Assert.That(redirect!.Url, Is.EqualTo("/verify-email-success"));
        }

        [Test]
        public async Task VerifyEmail_WithInvalidUserId_ReturnsBadRequest()
        {
            // Arrange
            _userManagerMock.Setup(x => x.FindByIdAsync("bad-id")).ReturnsAsync((User)null);

            // Act
            var result = await _authController.VerifyEmail("bad-id", "some-token");

            // Assert
            Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task VerifyEmail_WithInvalidToken_ReturnsBadRequest()
        {
            // Arrange
            var userId = "user1";
            var user = new User { Id = userId };
            _userManagerMock.Setup(x => x.FindByIdAsync(userId)).ReturnsAsync(user);
            _userManagerMock
                .Setup(x => x.ConfirmEmailAsync(user, "bad-token"))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Invalid token" }));

            // Act
            var result = await _authController.VerifyEmail(userId, "bad-token");

            // Assert
            Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task VerifyEmail_WithMissingParams_ReturnsBadRequest()
        {
            // Act
            var result = await _authController.VerifyEmail("", "");

            // Assert
            Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
        }
    }
}
