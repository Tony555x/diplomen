using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class TaskTypeFieldCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskFieldValues_TaskFields_TaskFieldId",
                table: "TaskFieldValues");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskFieldValues_Tasks_TaskId",
                table: "TaskFieldValues");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskFieldValues_TaskFields_TaskFieldId",
                table: "TaskFieldValues",
                column: "TaskFieldId",
                principalTable: "TaskFields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskFieldValues_Tasks_TaskId",
                table: "TaskFieldValues",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskFieldValues_TaskFields_TaskFieldId",
                table: "TaskFieldValues");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskFieldValues_Tasks_TaskId",
                table: "TaskFieldValues");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskFieldValues_TaskFields_TaskFieldId",
                table: "TaskFieldValues",
                column: "TaskFieldId",
                principalTable: "TaskFields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskFieldValues_Tasks_TaskId",
                table: "TaskFieldValues",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
