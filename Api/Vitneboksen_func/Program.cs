using FireSharp.Config;
using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Shared;
using Vitneboksen_func;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        var configuration = context.Configuration;
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options =>
        {
            options.AddPolicy("AllowedOrigins", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                        .WithMethods("GET", "POST", "DELETE", "OPTIONS")
                        .WithHeaders("Content-Type", "Authorization", "X-Requested-With")
                        .AllowCredentials();
            });
        });

        var firesharpSecrets = configuration.GetSection("FireSharp");
        var firebaseService = new FirebaseService(new FirebaseConfig
        {
            BasePath = firesharpSecrets.GetValue<string>("BasePath"),
            AuthSecret = firesharpSecrets.GetValue<string>("AuthSecret"),
        });
        services.AddSingleton(firebaseService);
        
        var storageConnectionString = configuration.GetValue<string>("StorageConnectionString") ?? "";
        services.AddSingleton(new StorageConfig { ConnectionString = storageConnectionString });
    })
    .Build();

host.Run();

namespace Vitneboksen_func
{
    public class StorageConfig
    {
        public string ConnectionString { get; set; } = "";
    }
}
