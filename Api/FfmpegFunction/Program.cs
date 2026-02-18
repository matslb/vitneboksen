using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

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
                .Build();

            host.Run();
        }
    }
}
