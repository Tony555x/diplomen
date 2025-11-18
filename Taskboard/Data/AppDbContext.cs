using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Taskboard.Data.Models;

public class AppDbContext : IdentityDbContext<User>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<TaskItem> Tasks { get; set; }

    public DbSet<WorkspaceMember> WorkspaceMembers{get;set;}
    public DbSet<ProjectMember> ProjectMembers {get; set;}

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<WorkspaceMember>()
            .HasKey(x => new { x.WorkspaceId, x.UserId });
            
        builder.Entity<WorkspaceMember>()
            .HasOne(wm => wm.User)
            .WithMany(u => u.WorkspaceMemberships)
            .HasForeignKey(wm => wm.UserId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Entity<ProjectMember>()
            .HasKey(x => new { x.ProjectId, x.UserId });

        builder.Entity<UserTask>()
            .HasKey(x => new { x.TaskItemId, x.UserId });
    }
}
