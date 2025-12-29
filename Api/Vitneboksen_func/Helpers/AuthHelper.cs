using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker.Http;
using Shared;

namespace Vitneboksen_func.Helpers;

public static class AuthHelper
{
    private static readonly string[] PublicPaths = 
    {
        "/upload-testimony/v2",
        "/wake-up",
        "/create-session"
    };

    public static async Task<(bool IsAuthorized, HttpResponseData? UnauthorizedResponse)> IsAuthorizedAsync(
        HttpRequestData request,
        FirebaseService firebaseService,
        bool isPublicEndpoint = false)
    {
        var path = request.Url.AbsolutePath;
        
        // Check if this is a public endpoint
        if (isPublicEndpoint || PublicPaths.Any(p => path.Equals(p, StringComparison.OrdinalIgnoreCase)))
        {
            return (true, null);
        }

        // Extract userToken from cookie
        var userTokenFromCookie = RequestHelper.ExtractCookieValue(request, "userToken");

        // Extract sessionKey from query parameters
        var queryParams = RequestHelper.ExtractQueryParameters(request.Url.Query);
        queryParams.TryGetValue("sessionKey", out var sessionKey);

        if (string.IsNullOrWhiteSpace(userTokenFromCookie) || string.IsNullOrWhiteSpace(sessionKey))
        {
            var unauthorizedResponse = request.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
            await unauthorizedResponse.WriteStringAsync("\r\n         / \\\r\n        |\\_/|\r\n        |---|\r\n        |   |\r\n        |   |\r\n      _ |=-=| _\r\n  _  / \\|   |/ \\\r\n / \\|   |   |   ||\\\r\n|   |   |   |   | \\>\r\n|   |   |   |   |   \\\r\n| -   -   -   - |)   )\r\n|                   /\r\n \\                 /\r\n  \\               /\r\n   \\             /\r\n    \\           /\r\n");
            return (false, unauthorizedResponse);
        }

        var authorized = firebaseService.AuthourizeUserBySessionKey(sessionKey, userTokenFromCookie);
        if (!authorized)
        {
            var unauthorizedResponse = request.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
            return (false, unauthorizedResponse);
        }

        return (true, null);
    }
}

