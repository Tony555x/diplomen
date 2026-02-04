using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class taskblocking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaskBlockers",
                columns: table => new
                {
                    BlockingTaskId = table.Column<int>(type: "int", nullable: false),
                    BlockedTaskId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskBlockers", x => new { x.BlockingTaskId, x.BlockedTaskId });
                    table.ForeignKey(
                        name: "FK_TaskBlockers_Tasks_BlockedTaskId",
                        column: x => x.BlockedTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskBlockers_Tasks_BlockingTaskId",
                        column: x => x.BlockingTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskBlockers_BlockedTaskId",
                table: "TaskBlockers",
                column: "BlockedTaskId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskBlockers");
        }
    }
}
