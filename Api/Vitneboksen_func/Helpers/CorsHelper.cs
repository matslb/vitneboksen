using System.Collections.Generic;
using System.Linq;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace Vitneboksen_func.Helpers;

public static class CorsHelper
{
    public static void AddCorsHeaders(HttpResponseData response, IConfiguration configuration)
    {
        // Get allowed origins from configuration
        var allowedOrigins = new List<string>();
        
        // Try different configuration paths
        var originsFromConfig = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (originsFromConfig != null)
        {
            allowedOrigins.AddRange(originsFromConfig);
        }
        
        // Also check environment variable format (for local.settings.json)
        var index = 0;
        while (true)
        {
            var origin = configuration[$"Cors__AllowedOrigins__{index}"];
            if (string.IsNullOrEmpty(origin))
                break;
            allowedOrigins.Add(origin);
            index++;
        }

        // Get origin from request if available
        // Note: In Azure Functions, we'd typically get this from the request headers
        // For now, we'll add a wildcard or specific origins
        if (allowedOrigins.Count > 0)
        {
            // In production, you should validate the Origin header against allowedOrigins
            response.Headers.Add("Access-Control-Allow-Origin", allowedOrigins.FirstOrDefault() ?? "*");
        }
        else
        {
            response.Headers.Add("Access-Control-Allow-Origin", "*");
        }

        response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        response.Headers.Add("Access-Control-Allow-Credentials", "true");
    }
}

