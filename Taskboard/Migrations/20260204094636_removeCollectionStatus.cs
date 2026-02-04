using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class removeCollectionStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Collections");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Collections",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
