using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Taskboard.Controllers;
using Taskboard.Data;
using Taskboard.Data.Models;

namespace Taskboard.Tests.Controllers
{
    [TestFixture]
    public class UserProfileControllerTests
    {
        private AppDbContext _context;
        private UserProfileController _userProfileController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _userProfileController = new UserProfileController(_context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _userProfileController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task GetProfile_WithValidUser_ReturnsProfile()
        {
            // Arrange
            var user = new User { Id = "user1", UserName = "TestUser", Email = "test@test.com", AvatarColor = "#FFF" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Act
            var result = await _userProfileController.GetProfile() as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var t = result.Value.GetType();
            Assert.That(t.GetProperty("UserName").GetValue(result.Value, null), Is.EqualTo("TestUser"));
            Assert.That(t.GetProperty("Email").GetValue(result.Value, null), Is.EqualTo("test@test.com"));
        }

        [Test]
        public async Task GetProfile_WithInvalidUser_ReturnsNotFound()
        {
            // Act
            var result = await _userProfileController.GetProfile();

            // Assert
            Assert.That(result, Is.InstanceOf<NotFoundResult>());
        }

        [Test]
        public async Task UpdateProfile_WithValidColor_UpdatesAndReturns()
        {
            // Arrange
            var user = new User { Id = "user1", UserName = "TestUser", AvatarColor = "#000" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            _context.Entry(user).State = EntityState.Detached;

            var request = new UpdateProfileRequest("#FFF");

            // Act
            var result = await _userProfileController.UpdateProfile(request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbUser = await _context.Users.FindAsync("user1");
            Assert.That(dbUser.AvatarColor, Is.EqualTo("#FFF"));
        }
    }
}
