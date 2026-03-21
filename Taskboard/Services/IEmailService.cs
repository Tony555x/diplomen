namespace Taskboard.Services
{
    public interface IEmailService
    {
        /// <summary>
        /// Sends an email verification link to the user.
        /// </summary>
        Task SendVerificationEmailAsync(string toEmail, string toName, string verifyUrl);
    }
}
