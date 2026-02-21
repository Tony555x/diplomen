using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Taskboard.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/projects/{projectId}/dashboard")]
    public class DashboardController : ControllerBase
    {
        public DashboardController()
        {
        }

        [HttpGet]
        public IActionResult GetDashboard()
        {
            return Ok(new { message = "Dashboard data will be provided here." });
        }
    }
}
