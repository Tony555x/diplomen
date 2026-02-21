using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class AddWidgetName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "DashboardWidgets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "DashboardWidgets");
        }
    }
}
