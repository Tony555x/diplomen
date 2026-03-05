namespace Taskboard.Data.Models
{
    /// <summary>
    /// Central place for all model field length and validation constants.
    /// Shared between model annotations and business-logic validation.
    /// </summary>
    public static class ModelConstants
    {
        public static class Workspace
        {
            public const int NameMaxLength = 100;
        }

        public static class Project
        {
            public const int NameMaxLength = 100;
        }

        public static class Collection
        {
            public const int NameMaxLength = 100;
        }

        public static class ProjectRole
        {
            public const int RoleNameMaxLength = 100;
        }

        public static class WorkspaceMember
        {
            public const int RoleMaxLength = 50;
            public const int StatusMaxLength = 20;
        }

        public static class ProjectMember
        {
            public const int StatusMaxLength = 20;
        }

        public static class TaskItem
        {
            public const int TitleMaxLength = 1000;
            public const int StatusMaxLength = 100;
        }

        public static class TaskType
        {
            public const int NameMaxLength = 100;
            public const int DescriptionMaxLength = 500;
            public const int IconMaxLength = 255;
        }

        public static class TaskField
        {
            public const int NameMaxLength = 100;
            public const int DescriptionMaxLength = 500;
            public const int DefaultValueMaxLength = 1000;
            public const int OptionsMaxLength = 2000;
        }

        public static class TaskFieldValue
        {
            public const int ValueMaxLength = 2000;
        }

        public static class TaskHistory
        {
            public const int ActionTypeMaxLength = 100;
            public const int DetailsMaxLength = 500;
        }

        public static class TaskMessage
        {
            public const int ContentMaxLength = 4000;
        }

        public static class Notification
        {
            public const int TitleMaxLength = 200;
            public const int MessageMaxLength = 1000;
        }

        public static class DashboardWidget
        {
            public const int NameMaxLength = 100;
            public const int SourceMaxLength = 2000;
            public const int ResultMaxLength = 4000;
        }

        public static class WidgetTemplate
        {
            public const int NameMaxLength = 100;
            public const int DescriptionMaxLength = 300;
            public const int CategoryMaxLength = 20;
        }

        public static class User
        {
            public const int AvatarColorMaxLength = 20;
        }
    }
}
