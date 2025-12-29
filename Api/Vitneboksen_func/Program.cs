using System;
using FireSharp.Config;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Shared;

namespace Vitneboksen_func;

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
                    config.AddJsonFile("local.settings.json", optional: true, reloadOnChange: true);
                    config.AddUserSecrets<Program>();
                }
            })
            .ConfigureServices((hostContext, services) =>
            {
                var configuration = hostContext.Configuration;
                
                // Register FirebaseService as singleton
                var firesharpConfig = new FirebaseConfig
                {
                    BasePath = configuration["FireSharp:BasePath"] ?? 
                               configuration["FireSharp__BasePath"] ?? 
                               Environment.GetEnvironmentVariable("FireSharp__BasePath") ?? "",
                    AuthSecret = configuration["FireSharp:AuthSecret"] ?? 
                                configuration["FireSharp__AuthSecret"] ?? 
                                Environment.GetEnvironmentVariable("FireSharp__AuthSecret") ?? ""
                };
                
                services.AddSingleton<FirebaseService>(sp => new FirebaseService(firesharpConfig));
                
                // Register IConfiguration
                services.AddSingleton<IConfiguration>(configuration);
                
                // Register Application Insights if connection string is provided
                var appInsightsConnectionString = configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"] ??
                                                   configuration["ApplicationInsights:ConnectionString"];
                if (!string.IsNullOrEmpty(appInsightsConnectionString))
                {
                    services.AddApplicationInsightsTelemetryWorkerService(options =>
                    {
                        options.ConnectionString = appInsightsConnectionString;
                    });
                }
            })
            .Build();

        host.Run();
    }
}

