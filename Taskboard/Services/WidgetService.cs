using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Taskboard.Data.Models;

namespace Taskboard.Services
{
    public class WidgetService : IWidgetService
    {
        private readonly AppDbContext _context;

        public WidgetService(AppDbContext context)
        {
            _context = context;
        }

        public Task<(List<object> Results, string ListType)> ProcessListResultAsync(DashboardWidget widget)
        {
            var results = new List<object>();
            string listType = "Unknown";
            
            string currentType = string.Empty;
            string currentDetail = string.Empty;
            string currentState = string.Empty;

            if (string.IsNullOrWhiteSpace(widget.Source))
                return Task.FromResult((results, listType));

            string[] words = widget.Source.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);

            for (int i = 0; i < words.Length; i++)
            {
                string word = words[i].ToUpperInvariant();
                
                switch (word)
                {
                    case "SELECT":
                        currentState = "SELECT";
                        break;
                    case "TASK":
                    case "MEMBER":
                        if (currentState == "SELECT")
                        {
                            currentType = word;
                            listType = word;
                        }
                        break;
                    case "WHERE":
                        currentState = "WHERE";
                        break;
                    case "TYPE":
                    case "COMPLETED":
                    case "STATUS":
                    case "ROLE":
                        if (currentState == "WHERE")
                        {
                            currentDetail = word;
                        }
                        break;
                }
            }

            // Implement actual query logic based on currentType and currentDetail here...

            return Task.FromResult((results, listType));
        }
    }
}
