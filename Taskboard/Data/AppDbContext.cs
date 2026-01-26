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

    public DbSet<WorkspaceMember> WorkspaceMembers { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<ProjectRole> ProjectRoles { get; set; }

    public DbSet<TaskType> TaskTypes { get; set; }
    public DbSet<TaskField> TaskFields { get; set; }
    public DbSet<TaskFieldValue> TaskFieldValues { get; set; }


    public DbSet<UserTask> UserTasks { get; set; }
    public DbSet<Collection> Collections { get; set; }

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

        builder.Entity<ProjectMember>()
            .HasOne(pm => pm.ProjectRole)
            .WithMany(pr => pr.Members)
            .HasForeignKey(pm => pm.ProjectRoleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ProjectRole>()
            .HasOne(pr => pr.Project)
            .WithMany(p => p.Roles)
            .HasForeignKey(pr => pr.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserTask>()
            .HasKey(x => new { x.TaskItemId, x.UserId });

        // Task Type System Configurations
        // TaskType -> Project: Cascade (when project is deleted, delete all its task types)
        builder.Entity<TaskType>()
            .HasOne(tt => tt.Project)
            .WithMany(p => p.TaskTypes)
            .HasForeignKey(tt => tt.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // TaskField -> TaskType: Cascade (when task type is deleted, delete all its fields)
        builder.Entity<TaskField>()
            .HasOne(tf => tf.TaskType)
            .WithMany(tt => tt.Fields)
            .HasForeignKey(tf => tf.TaskTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // TaskItem -> TaskType: Restrict (prevent deleting task type if tasks are using it)
        builder.Entity<TaskItem>()
            .HasOne(t => t.TaskType)
            .WithMany(tt => tt.Tasks)
            .HasForeignKey(t => t.TaskTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        //when task is deleted, do not delete all of its fieldvalues(prevent double cascade path)
        builder.Entity<TaskFieldValue>()
            .HasOne(tfv => tfv.Task)
            .WithMany(t => t.FieldValues)
            .HasForeignKey(tfv => tfv.TaskId)
            .OnDelete(DeleteBehavior.Restrict);

        //when field is deleted, velete all of its values
        builder.Entity<TaskFieldValue>()
            .HasOne(tfv => tfv.TaskField)
            .WithMany(tf => tf.FieldValues)
            .HasForeignKey(tfv => tfv.TaskFieldId)
            .OnDelete(DeleteBehavior.Cascade);

        // Collection Configurations
        // Collection -> Project: Cascade (when project is deleted, delete all its collections)
        builder.Entity<Collection>()
            .HasOne(c => c.Project)
            .WithMany()
            .HasForeignKey(c => c.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // Collection -> ParentCollection: Restrict (prevent deleting parent if it has children)
        builder.Entity<Collection>()
            .HasOne(c => c.ParentCollection)
            .WithMany(c => c.ChildCollections)
            .HasForeignKey(c => c.ParentCollectionId)
            .OnDelete(DeleteBehavior.Restrict);

        // TaskItem -> Collection: Restrict (prevent cascade path conflicts)
        // Tasks must be manually moved to null/root before deleting a collection
        builder.Entity<TaskItem>()
            .HasOne(t => t.Collection)
            .WithMany(c => c.Tasks)
            .HasForeignKey(t => t.CollectionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
