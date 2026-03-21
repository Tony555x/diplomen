using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Taskboard.Services
{
    public class GmailEmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public GmailEmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendVerificationEmailAsync(string toEmail, string toName, string verifyUrl)
        {
            var gmailUser = _config["GMAIL_EMAIL"];
            var clientId = _config["GMAIL_CLIENT_ID"];
            var clientSecret = _config["GMAIL_CLIENT_SECRET"];
            var refreshToken = _config["GMAIL_REFRESH_TOKEN"];

            if (string.IsNullOrEmpty(gmailUser) || string.IsNullOrEmpty(clientId) ||
                string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(refreshToken))
            {
                throw new Exception("Gmail configuration is missing in .env");
            }

            var clientSecrets = new ClientSecrets { ClientId = clientId, ClientSecret = clientSecret };
            var credential = new UserCredential(
                new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer { ClientSecrets = clientSecrets }),
                "user",
                new TokenResponse { RefreshToken = refreshToken }
            );

            await credential.RefreshTokenAsync(CancellationToken.None);
            var accessToken = credential.Token.AccessToken;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Taskboard", gmailUser));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = "Verify your Taskboard account";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $"<p>Hi {toName},</p><p>Please verify your email by clicking the link below:</p><p><a href='{verifyUrl}'>Verify Email</a></p>"
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var smtpClient = new SmtpClient();
            smtpClient.CheckCertificateRevocation = false;

            await smtpClient.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);

            var oauth2 = new SaslMechanismOAuth2(gmailUser, accessToken);
            await smtpClient.AuthenticateAsync(oauth2);

            await smtpClient.SendAsync(message);
            await smtpClient.DisconnectAsync(true);
        }
    }
}
