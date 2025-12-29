using System;
using System.Collections.Generic;
using Microsoft.Azure.Functions.Worker.Http;

namespace Vitneboksen_func.Helpers;

public static class RequestHelper
{
    public static Dictionary<string, string> ExtractQueryParameters(string queryString)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrEmpty(queryString)) return result;

        var query = queryString.TrimStart('?');
        var pairs = query.Split('&');
        foreach (var pair in pairs)
        {
            var parts = pair.Split('=', 2);
            if (parts.Length == 2)
            {
                result[parts[0]] = parts[1];
            }
        }
        return result;
    }

    public static string? ExtractCookieValue(HttpRequestData request, string cookieName)
    {
        if (!request.Headers.TryGetValues("Cookie", out var cookieHeaders))
            return null;

        foreach (var cookieHeader in cookieHeaders)
        {
            var cookies = cookieHeader.Split(';');
            foreach (var cookie in cookies)
            {
                var parts = cookie.Trim().Split('=', 2);
                if (parts.Length == 2 && parts[0].Trim().Equals(cookieName, StringComparison.OrdinalIgnoreCase))
                {
                    return parts[1].Trim();
                }
            }
        }
        return null;
    }
}

