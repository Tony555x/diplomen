using Taskboard.Data.Models;

namespace Taskboard.Services
{
    public interface IProjectAccessService
    {
        /// <summary>
        /// Returns true if the user can view the project,
        /// either via direct active membership or via the project's access level (Public/Workspace).
        /// </summary>
        Task<bool> HasViewAccessAsync(int projectId, string userId);

        /// <summary>
        /// Returns the user's active ProjectMember record (with Role included) if they are an explicit member.
        /// Returns null if the user only has access via access level (read-only guest access).
        /// </summary>
        Task<ProjectMember?> GetMembershipAsync(int projectId, string userId);
    }
}
