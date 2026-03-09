using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using NUnit.Framework;
using Taskboard.Controllers.Projects;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Services;
using Taskboard.Contracts.Projects;

namespace Taskboard.Tests.Controllers.Projects
{
    [TestFixture]
    public class CollectionsControllerTests
    {
        private AppDbContext _context;
        private Mock<IProjectAccessService> _projectAccessServiceMock;
        private CollectionsController _collectionsController;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _projectAccessServiceMock = new Mock<IProjectAccessService>();

            _collectionsController = new CollectionsController(_context, _projectAccessServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1"),
            }, "mock"));

            _collectionsController.ControllerContext = new ControllerContext
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
        public async Task GetCollections_WithViewAccess_ReturnsCollections()
        {
            // Arrange
            var projectId = 1;
            _projectAccessServiceMock.Setup(x => x.HasViewAccessAsync(projectId, "user1")).ReturnsAsync(true);

            _context.Collections.Add(new Collection { Id = 1, ProjectId = projectId, Name = "Collection 1" });
            _context.Collections.Add(new Collection { Id = 2, ProjectId = projectId, Name = "Collection 2" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _collectionsController.GetCollections(projectId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var collections = result.Value as IEnumerable<object>;
            Assert.That(collections, Is.Not.Null);
            Assert.That(collections.Count(), Is.EqualTo(2));
        }

        [Test]
        public async Task CreateCollection_WithProjectAccess_CreatesCollection()
        {
            // Arrange
            var projectId = 1;
            
            // Require project member access
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active });
            await _context.SaveChangesAsync();

            var request = new CreateCollectionRequest { Name = "New Collection" };

            // Act
            var result = await _collectionsController.CreateCollection(projectId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(200));

            var dbCollection = await _context.Collections.FirstOrDefaultAsync(c => c.Name == "New Collection");
            Assert.That(dbCollection, Is.Not.Null);
            Assert.That(dbCollection.ProjectId, Is.EqualTo(projectId));
        }

        [Test]
        public async Task UpdateCollection_WithValidData_UpdatesName()
        {
             // Arrange
            var projectId = 1;
            var collectionId = 1;
            
            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active });
            _context.Collections.Add(new Collection { Id = collectionId, ProjectId = projectId, Name = "Old Name" });
            await _context.SaveChangesAsync();

            var request = new UpdateCollectionRequest { Name = "New Name" };

            // Act
            var result = await _collectionsController.UpdateCollection(projectId, collectionId, request) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            var dbCollection = await _context.Collections.FindAsync(collectionId);
            Assert.That(dbCollection.Name, Is.EqualTo("New Name"));
        }

        [Test]
        public async Task DeleteCollection_WithoutChildCollections_DeletesAndUnassignsTasks()
        {
            // Arrange
            var projectId = 1;
            var collectionId = 1;

            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active });
            var collection = new Collection { Id = collectionId, ProjectId = projectId, Name = "To Delete" };
            _context.Collections.Add(collection);
            
            var task = new TaskItem { Id = 1, ProjectId = projectId, Title = "Task in collection", CollectionId = collectionId };
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Act
            var result = await _collectionsController.DeleteCollection(projectId, collectionId) as OkObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            
            var dbCollection = await _context.Collections.FindAsync(collectionId);
            Assert.That(dbCollection, Is.Null);

            var dbTask = await _context.Tasks.FindAsync(1);
            Assert.That(dbTask.CollectionId, Is.Null);
        }

        [Test]
        public async Task DeleteCollection_WithChildCollections_ReturnsBadRequest()
        {
            // Arrange
            var projectId = 1;
            var collectionId = 1;

            _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = "user1", Status = ProjectMemberStatus.Active });
            var collection = new Collection { Id = collectionId, ProjectId = projectId, Name = "Parent" };
            var childCollection = new Collection { Id = 2, ProjectId = projectId, Name = "Child", ParentCollectionId = collectionId };
            _context.Collections.AddRange(collection, childCollection);
            await _context.SaveChangesAsync();

            // Act
            var result = await _collectionsController.DeleteCollection(projectId, collectionId) as BadRequestObjectResult;

            // Assert
            Assert.That(result, Is.Not.Null);
            Assert.That(result.StatusCode, Is.EqualTo(400));
        }
    }
}
