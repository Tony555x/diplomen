using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using NUnit.Framework;
using Taskboard.Data;
using Taskboard.Data.Models;
using Taskboard.Repositories;

namespace Taskboard.Tests.Repositories
{
    [TestFixture]
    public class WorkspaceRepositoryTests
    {
        private AppDbContext _context;
        private Mock<IProjectRepository> _projectRepositoryMock;
        private WorkspaceRepository _workspaceRepository;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _projectRepositoryMock = new Mock<IProjectRepository>();
            _workspaceRepository = new WorkspaceRepository(_context, _projectRepositoryMock.Object);
        }

        [TearDown]
        public void TearDown()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Test]
        public async Task DeleteWorkspaceAsync_CascadesDependenciesAndCallsProjectRepo()
        {
            var workspaceId = 1;
            _context.Workspaces.Add(new Workspace { Id = workspaceId, Name = "Test WS" });
            
            _context.Projects.Add(new Project { Id = 100, WorkspaceId = workspaceId, Name = "Proj1" });
            _context.Projects.Add(new Project { Id = 101, WorkspaceId = workspaceId, Name = "Proj2" });
            
            _context.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = "u1", Status = "Active" });
            
            await _context.SaveChangesAsync();

            await _workspaceRepository.DeleteWorkspaceAsync(workspaceId, true);

            _projectRepositoryMock.Verify(x => x.DeleteProjectAsync(100, false), Times.Once);
            _projectRepositoryMock.Verify(x => x.DeleteProjectAsync(101, false), Times.Once);

            var dbWorkspace = await _context.Workspaces.FindAsync(workspaceId);
            Assert.That(dbWorkspace, Is.Null);
            
            Assert.That(await _context.WorkspaceMembers.AnyAsync(), Is.False);
        }
    }
}
