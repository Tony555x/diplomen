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
                
                if (target == "TASKS")
                {
                    listType = "Tasks";
                    var param = Expression.Parameter(typeof(TaskItem), "t");
                    Expression body = null;
                    
                    // Find WHERE
                    while (i < tokens.Count && tokens[i].ToUpperInvariant() != "WHERE") i++;
                    if (i < tokens.Count) i++; // skip WHERE
                    
                    while (i < tokens.Count)
                    {
                        string detail = tokens[i].ToUpperInvariant();
                        i++;
                        if (i >= tokens.Count) throw new Exception("Error: Expected operator.");
                        
                        string op = tokens[i].ToUpperInvariant();
                        i++;
                        if (i >= tokens.Count) throw new Exception("Error: Expected value.");
                        
                        string val = tokens[i];
                        i++;

                        Expression condition = null;
                        if (detail == "TYPE")
                        {
                            listType = "TypedTasks";
                            var navTaskType = Expression.Property(param, "TaskType");
                            var navNotNull = Expression.NotEqual(navTaskType, Expression.Constant(null, typeof(TaskType)));
                            var propName = Expression.Property(navTaskType, "Name");
                            condition = BuildComparison(propName, val, op);
                            if (condition != null)
                                condition = Expression.AndAlso(navNotNull, condition);
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
                            condition = BuildStringComparison(propStatus, val, op);
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
                else if (target == "MEMBERS")
                {
                    listType = "Members";
                    var param = Expression.Parameter(typeof(ProjectMember), "m");
                    Expression body = null;
                    
                    // Find WHERE
                    while (i < tokens.Count && tokens[i].ToUpperInvariant() != "WHERE") i++;
                    if (i < tokens.Count) i++; // skip WHERE
                    
                    while (i < tokens.Count)
                    {
                        string detail = tokens[i].ToUpperInvariant();
                        i++;
                        if (i >= tokens.Count) throw new Exception("Error: Expected operator.");
                        
                        string op = tokens[i].ToUpperInvariant();
                        i++;
                        if (i >= tokens.Count) throw new Exception("Error: Expected value.");

                        string val = tokens[i];
                        i++;

                        Expression condition = null;
                        if (detail == "ROLE")
                        {
                            var navRole = Expression.Property(param, "ProjectRole");
                            var navNotNull = Expression.NotEqual(navRole, Expression.Constant(null, typeof(ProjectRole)));
                            var propName = Expression.Property(navRole, "RoleName");
                            condition = BuildStringComparison(propName, val, op);
                            if (condition != null)
                                condition = Expression.AndAlso(navNotNull, condition);
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
                    throw new ArgumentException($"Invalid SELECT target: '{target}'. Expected 'TASKS' or 'MEMBERS'.");
                }
            }
            else
            {
                throw new ArgumentException("Invalid query format. Expected 'SELECT [TASKS | MEMBERS] ...'");
            }

            return (results, listType);
        }

        private Expression BuildComparison(MemberExpression property, string value, string op)
        {
            if (op == "=" || op == "!=")
            {
                return BuildStringComparison(property, value, op);
            }

            // For <, >, <=, >= we need to handle numerical or date comparisons if possible.
            // But since our properties are mostly strings or enums right now, if they want to
            // do > or < on a string, it's not directly supported by EF core in a simple Expression.LessThan.
            // Let's at least throw or handle if the underlying type is not string.
            
            var underlyingType = Nullable.GetUnderlyingType(property.Type) ?? property.Type;
            
            if (underlyingType == typeof(int) || underlyingType == typeof(long) || underlyingType == typeof(double) || underlyingType == typeof(decimal))
            {
                if (double.TryParse(value, out double numVal))
                {
                    var convertedVal = Convert.ChangeType(numVal, underlyingType);
                    var constant = Expression.Constant(convertedVal, property.Type);
                    
                    switch (op)
                    {
                        case ">": return Expression.GreaterThan(property, constant);
                        case ">=": return Expression.GreaterThanOrEqual(property, constant);
                        case "<": return Expression.LessThan(property, constant);
                        case "<=": return Expression.LessThanOrEqual(property, constant);
                    }
                }
            }
            else if (underlyingType == typeof(DateTime))
            {
                if (DateTime.TryParse(value, out DateTime dateVal))
                {
                    // EF handles DateTime constants
                    var constant = Expression.Constant(dateVal, property.Type);
                    switch (op)
                    {
                        case ">": return Expression.GreaterThan(property, constant);
                        case ">=": return Expression.GreaterThanOrEqual(property, constant);
                        case "<": return Expression.LessThan(property, constant);
                        case "<=": return Expression.LessThanOrEqual(property, constant);
                    }
                }
            }

            // Fallback: If it's none of the above, just do string comparison as a fallback, 
            // even though < > on strings might fail in EF depending on provider.
            // But usually TYPE is a string and they only use = or !=
            return BuildStringComparison(property, value, op);
        }

        private Expression BuildStringComparison(MemberExpression property, string value, string op)
        {
            var constant = Expression.Constant(value);

            switch (op)
            {
                case "=":
                    return Expression.Equal(property, constant);
                case "!=":
                    return Expression.NotEqual(property, constant);
                default:
                    // Fallback to equal
                    return Expression.Equal(property, constant);
            }
        }
    }
}
