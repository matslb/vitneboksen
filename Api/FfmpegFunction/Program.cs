using FirebaseAdmin;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Shared;
using System;

namespace FfmpegFunction
{
    internal class Program
    {
        static void Main(string[] args)
        {
            var host = new HostBuilder()
                .ConfigureFunctionsWorkerDefaults()
                .ConfigureAppConfiguration((hostContext, config) =>
                {
                    if (hostContext.HostingEnvironment.IsDevelopment())
                    {
                        config.AddJsonFile("local.settings.json");
                        config.AddUserSecrets<Program>();
                    }

                })
                .ConfigureServices((context, services) =>
                {
                    var firebaseService = new FirebaseService(new FireSharp.Config.FirebaseConfig
                    {
                        AuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret"),
                        BasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath"),
                    });
                    services.AddSingleton(firebaseService);

                    var firebaseAuth = FirebaseApp.Create(new AppOptions
                    {
                        Credential = Google.Apis.Auth.OAuth2.GoogleCredential.FromFile(
                            Environment.GetEnvironmentVariable("Firebase__CredentialsPath"))
                    });

                })
                .Build();

            host.Run();
        }
    }
}
