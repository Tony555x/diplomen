using System.Collections.Generic;
using System.Threading.Tasks;
using Taskboard.Data.Models;

namespace Taskboard.Services
{
    /// <summary>
    /// Represents the result of executing a widget query.
    /// </summary>
    public class WidgetResult
    {
        /// <summary>
        /// "TaskList" | "MemberList" | "GroupedResult"
        /// </summary>
        public string ResultType { get; set; } = string.Empty;

        /// <summary>
        /// For TaskList / MemberList: the raw entity rows.
        /// For GroupedResult: list of { Label, Value } objects.
        /// </summary>
        public object Data { get; set; } = new List<object>();
    }

    public interface IWidgetService
    {
        Task<WidgetResult> ExecuteQueryAsync(DashboardWidget widget);
    }
}
