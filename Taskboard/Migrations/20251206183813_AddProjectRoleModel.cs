using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Taskboard.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectRoleModel : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Create ProjectRoles table
            migrationBuilder.CreateTable(
                name: "ProjectRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    RoleName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CanAddEditMembers = table.Column<bool>(type: "bit", nullable: false),
                    CanEditProjectSettings = table.Column<bool>(type: "bit", nullable: false),
                    IsOwner = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectRoles_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectRoles_ProjectId",
                table: "ProjectRoles",
                column: "ProjectId");

            // Step 2: Add ProjectRoleId column (nullable initially)
            migrationBuilder.AddColumn<int>(
                name: "ProjectRoleId",
                table: "ProjectMembers",
                type: "int",
                nullable: true);

            // Step 3: Create default roles for each existing project and migrate data
            migrationBuilder.Sql(@"
                -- Create Owner and Member roles for each project
                INSERT INTO ProjectRoles (ProjectId, RoleName, CanAddEditMembers, CanEditProjectSettings, IsOwner)
                SELECT DISTINCT ProjectId, 'Owner', 1, 1, 1 FROM ProjectMembers WHERE Role = 'Owner'
                UNION
                SELECT DISTINCT ProjectId, 'Member', 0, 0, 0 FROM ProjectMembers WHERE Role = 'Member' OR Role != 'Owner';

                -- Update ProjectMembers to reference the new roles
                UPDATE pm
                SET pm.ProjectRoleId = pr.Id
                FROM ProjectMembers pm
                INNER JOIN ProjectRoles pr ON pm.ProjectId = pr.ProjectId
                WHERE pm.Role = 'Owner' AND pr.RoleName = 'Owner';

                UPDATE pm
                SET pm.ProjectRoleId = pr.Id
                FROM ProjectMembers pm
                INNER JOIN ProjectRoles pr ON pm.ProjectId = pr.ProjectId
                WHERE (pm.Role = 'Member' OR pm.Role != 'Owner') AND pr.RoleName = 'Member';
            ");

            // Step 4: Make ProjectRoleId non-nullable
            migrationBuilder.AlterColumn<int>(
                name: "ProjectRoleId",
                table: "ProjectMembers",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            // Step 5: Create index and foreign key
            migrationBuilder.CreateIndex(
                name: "IX_ProjectMembers_ProjectRoleId",
                table: "ProjectMembers",
                column: "ProjectRoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectMembers_ProjectRoles_ProjectRoleId",
                table: "ProjectMembers",
                column: "ProjectRoleId",
                principalTable: "ProjectRoles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Step 6: Drop old Role column
            migrationBuilder.DropColumn(
                name: "Role",
                table: "ProjectMembers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectMembers_ProjectRoles_ProjectRoleId",
                table: "ProjectMembers");

            migrationBuilder.DropTable(
                name: "ProjectRoles");

            migrationBuilder.DropIndex(
                name: "IX_ProjectMembers_ProjectRoleId",
                table: "ProjectMembers");

            migrationBuilder.DropColumn(
                name: "ProjectRoleId",
                table: "ProjectMembers");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "ProjectMembers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
