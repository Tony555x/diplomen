using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class WidgetTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WidgetTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    QueryJson = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WidgetTemplates", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "WidgetTemplates",
                columns: new[] { "Id", "Category", "Description", "Name", "QueryJson" },
                values: new object[,]
                {
                    { 1, "Tasks", "Lists every task in the project.", "All Tasks", "{\"select\":\"tasks\",\"filters\":[],\"groupBy\":null,\"aggregate\":null,\"value\":null}" },
                    { 2, "Tasks", "Tasks that are not yet completed.", "Open Tasks", "{\"select\":\"tasks\",\"filters\":[{\"field\":\"completed\",\"op\":\"=\",\"value\":\"false\"}],\"groupBy\":null,\"aggregate\":null,\"value\":null}" },
                    { 3, "Tasks", "Incomplete tasks past their due date.", "Overdue Tasks", "{\"select\":\"tasks\",\"filters\":[{\"field\":\"overdue\",\"op\":\"=\",\"value\":\"true\"}],\"groupBy\":null,\"aggregate\":null,\"value\":null}" },
                    { 4, "Tasks", "Tasks that are blocked by an unresolved dependency.", "Blocked Tasks", "{\"select\":\"tasks\",\"filters\":[{\"field\":\"isBlocked\",\"op\":\"=\",\"value\":\"true\"}],\"groupBy\":null,\"aggregate\":null,\"value\":null}" },
                    { 5, "Tasks", "Count of tasks grouped by their status.", "Tasks by Status", "{\"select\":\"tasks\",\"filters\":[],\"groupBy\":\"status\",\"aggregate\":{\"func\":\"count\"},\"value\":null}" },
                    { 6, "Tasks", "Count of tasks grouped by task type.", "Tasks by Type", "{\"select\":\"tasks\",\"filters\":[],\"groupBy\":\"type\",\"aggregate\":{\"func\":\"count\"},\"value\":null}" },
                    { 7, "Members", "Lists all active project members.", "Project Members", "{\"select\":\"members\",\"filters\":[],\"groupBy\":null,\"aggregate\":null,\"value\":null}" },
                    { 8, "Members", "Count of members grouped by role.", "Members by Role", "{\"select\":\"members\",\"filters\":[],\"groupBy\":\"role\",\"aggregate\":{\"func\":\"count\"},\"value\":null}" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WidgetTemplates");
        }
    }
}
