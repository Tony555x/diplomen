using System.Collections.Generic;
using System.Threading.Tasks;
using Taskboard.Data.Models;

namespace Taskboard.Services
{
    public interface IWidgetService
    {
        Task<(List<object> Results, string ListType)> ProcessListResultAsync(DashboardWidget widget);
    }
}
