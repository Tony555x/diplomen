using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using NUnit.Framework;
using Taskboard.Contracts;
using Taskboard.Controllers;
using Taskboard.Data.Models;

namespace Taskboard.Tests.Controllers
{
    [TestFixture]
    public class AuthControllerTests
    {
        private Mock<UserManager<User>> _userManagerMock;
        private Mock<IConfiguration> _configMock;
        private AuthController _authController;

        [SetUp]
        public void Setup()
        {
            var store = new Mock<IUserStore<User>>();
            _userManagerMock = new Mock<UserManager<User>>(store.Object, null, null, null, null, null, null, null, null);
            
            _configMock = new Mock<IConfiguration>();
            // Setup mock config for JWT
            _configMock.Setup(c => c["Jwt:Key"]).Returns("ThisIsAVerySecretKeyThatIsAtLeast32BytesLong!");
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns("TestIssuer");

            _authController = new AuthController(_userManagerMock.Object, _configMock.Object);
        }

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
            var responseData = result.Value as dynamic;
            // Can't easily assert anonymous types with dynamic in NUnit without extra effort or strongly typing, 
            // but we can serialize/deserialize or check properties if we use reflection, or just assert NotNull.
            // Using a simple workaround: object properties can be read using reflection if needed, but 
            // the returned type is anonymous `new { success = false, message = "...", errors = ... }`.
             var t = result.Value.GetType();
             Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
        }

        [Test]
        public async Task Register_WithValidData_ReturnsOk()
        {
            // Arrange
            var request = new RegisterRequest { Username = "newuser", Email = "new@test.com", Password = "Password123!" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.Email)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), request.Password)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _authController.Register(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.True);
            Assert.That(t.GetProperty("message").GetValue(result.Value, null), Is.EqualTo("User created successfully"));
        }

        [Test]
        public async Task Register_WithCreateFailure_ReturnsBadRequest()
        {
            // Arrange
            var request = new RegisterRequest { Username = "newuser", Email = "new@test.com", Password = "Weak" };
            _userManagerMock.Setup(x => x.FindByEmailAsync(request.Email)).ReturnsAsync((User)null);
            _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), request.Password)).ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Password too weak" }));

            // Act
            var result = await _authController.Register(request) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
            var t = result.Value.GetType();
            Assert.That(t.GetProperty("success").GetValue(result.Value, null), Is.False);
        }

        [Test]
        public async Task Login_WithInvalidUser_ReturnsUnauthorized()
        {
            // Arrange
            var request = new LoginRequest { Username = "nonexistent", Password = "password" };
            _userManagerMock.Setup(x => x.FindByNameAsync(request.Username)).ReturnsAsync((User)null);

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
            var request = new LoginRequest { Username = "user", Password = "wrongpassword" };
            var user = new User { UserName = "user" };
            _userManagerMock.Setup(x => x.FindByNameAsync(request.Username)).ReturnsAsync(user);
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
        public async Task Login_WithValidCredentials_ReturnsOkWithToken()
        {
             // Arrange
            var request = new LoginRequest { Username = "user", Password = "password" };
            var user = new User { Id = "user1", UserName = "user", Email = "user@test.com" };
            _userManagerMock.Setup(x => x.FindByNameAsync(request.Username)).ReturnsAsync(user);
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
    }
}
