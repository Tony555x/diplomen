using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskPermissionsToProjectRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanCreateDeleteTaskStatuses",
                table: "ProjectRoles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanCreateEditDeleteTasks",
                table: "ProjectRoles",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanCreateDeleteTaskStatuses",
                table: "ProjectRoles");

            migrationBuilder.DropColumn(
                name: "CanCreateEditDeleteTasks",
                table: "ProjectRoles");
        }
    }
}
