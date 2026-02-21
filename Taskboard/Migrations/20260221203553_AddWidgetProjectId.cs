using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class AddWidgetProjectId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "DashboardWidgets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_DashboardWidgets_ProjectId",
                table: "DashboardWidgets",
                column: "ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_DashboardWidgets_Projects_ProjectId",
                table: "DashboardWidgets",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DashboardWidgets_Projects_ProjectId",
                table: "DashboardWidgets");

            migrationBuilder.DropIndex(
                name: "IX_DashboardWidgets_ProjectId",
                table: "DashboardWidgets");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "DashboardWidgets");
        }
    }
}
