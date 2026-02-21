using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
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

        private List<string> Tokenize(string source)
        {
            var tokens = new List<string>();
            bool inQuotes = false;
            var currentToken = new StringBuilder();
            
            foreach (char c in source)
            {
                if (c == '"')
                {
                    inQuotes = !inQuotes;
                }
                else if (char.IsWhiteSpace(c) && !inQuotes)
                {
                    if (currentToken.Length > 0)
                    {
                        tokens.Add(currentToken.ToString());
                        currentToken.Clear();
                    }
                }
                else
                {
                    currentToken.Append(c);
                }
            }
            if (currentToken.Length > 0)
            {
                tokens.Add(currentToken.ToString());
            }
            return tokens;
        }

        public async Task<(List<object> Results, string ListType)> ProcessListResultAsync(DashboardWidget widget)
        {
            var results = new List<object>();
            string listType = "Unknown";

            if (string.IsNullOrWhiteSpace(widget.Source))
                return (results, listType);

            var tokens = Tokenize(widget.Source);
            int i = 0;
            
            // Find SELECT
            while (i < tokens.Count && tokens[i].ToUpperInvariant() != "SELECT") i++;
            if (i < tokens.Count) i++; // skip SELECT

            if (i < tokens.Count)
            {
                string target = tokens[i].ToUpperInvariant();
                i++;
                
                if (target == "TASK")
                {
                    listType = "Task";
                    var param = Expression.Parameter(typeof(TaskItem), "t");
                    Expression body = null;
                    
                    // Find WHERE
                    while (i < tokens.Count && tokens[i].ToUpperInvariant() != "WHERE") i++;
                    if (i < tokens.Count) i++; // skip WHERE
                    
                    while (i < tokens.Count)
                    {
                        string detail = tokens[i].ToUpperInvariant();
                        i++;
                        if (i >= tokens.Count) break;
                        string val = tokens[i];
                        i++;

                        Expression condition = null;
                        if (detail == "TYPE")
                        {
                            listType = "TypedTask";
                            var navTaskType = Expression.Property(param, "TaskType");
                            var navNotNull = Expression.NotEqual(navTaskType, Expression.Constant(null, typeof(TaskType)));
                            var propName = Expression.Property(navTaskType, "Name");
                            var nameEq = Expression.Equal(propName, Expression.Constant(val));
                            condition = Expression.AndAlso(navNotNull, nameEq);
                        }
                        else if (detail == "COMPLETED")
                        {
                            if (bool.TryParse(val, out bool isCompleted))
                            {
                                var propCompleted = Expression.Property(param, "Completed");
                                condition = Expression.Equal(propCompleted, Expression.Constant(isCompleted));
                            }
                        }
                        else if (detail == "STATUS")
                        {
                            var propStatus = Expression.Property(param, "Status");
                            condition = Expression.Equal(propStatus, Expression.Constant(val));
                        }

                        if (condition != null)
                        {
                            body = body == null ? condition : Expression.AndAlso(body, condition);
                        }
                    }

                    IQueryable<TaskItem> query = _context.Tasks
                        .Include(t => t.Project)
                        .Include(t => t.TaskType)
                        .Include(t => t.UserTasks).ThenInclude(u => u.User)
                        .Include(t => t.FieldValues).ThenInclude(fv => fv.TaskField)
                        .Where(t => t.ProjectId == widget.ProjectId);

                    if (body != null)
                    {
                        var lambda = Expression.Lambda<Func<TaskItem, bool>>(body, param);
                        query = query.Where(lambda);
                    }

                    var taskResults = await query.ToListAsync();
                    results.AddRange(taskResults);
                }
                else if (target == "MEMBER")
                {
                    listType = "Member";
                    var param = Expression.Parameter(typeof(ProjectMember), "m");
                    Expression body = null;
                    
                    // Find WHERE
                    while (i < tokens.Count && tokens[i].ToUpperInvariant() != "WHERE") i++;
                    if (i < tokens.Count) i++; // skip WHERE
                    
                    while (i < tokens.Count)
                    {
                        string detail = tokens[i].ToUpperInvariant();
                        i++;
                        if (i >= tokens.Count) break;
                        string val = tokens[i];
                        i++;

                        Expression condition = null;
                        if (detail == "ROLE")
                        {
                            var navRole = Expression.Property(param, "ProjectRole");
                            var navNotNull = Expression.NotEqual(navRole, Expression.Constant(null, typeof(ProjectRole)));
                            var propName = Expression.Property(navRole, "Name");
                            var nameEq = Expression.Equal(propName, Expression.Constant(val));
                            condition = Expression.AndAlso(navNotNull, nameEq);
                        }

                        if (condition != null)
                        {
                            body = body == null ? condition : Expression.AndAlso(body, condition);
                        }
                    }

                    IQueryable<ProjectMember> query = _context.ProjectMembers
                        .Include(pm => pm.User)
                        .Include(pm => pm.ProjectRole)
                        .Where(pm => pm.ProjectId == widget.ProjectId);

                    if (body != null)
                    {
                        var lambda = Expression.Lambda<Func<ProjectMember, bool>>(body, param);
                        query = query.Where(lambda);
                    }

                    var memberResults = await query.ToListAsync();
                    results.AddRange(memberResults);
                }
                else
                {
                    throw new ArgumentException($"Invalid SELECT target: '{target}'. Expected 'TASK' or 'MEMBER'.");
                }
            }
            else
            {
                throw new ArgumentException("Invalid query format. Expected 'SELECT [TASK | MEMBER] ...'");
            }

            return (results, listType);
        }
    }
}
