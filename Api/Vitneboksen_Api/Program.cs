using FireSharp.Config;
using Shared;
using Vitneboksen_Api;
using Vitneboksen_Api.Controllers;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
                .WithMethods("GET", "POST", "DELETE", "OPTIONS")
                .WithHeaders("Content-Type", "Authorization", "X-Requested-With")
                .AllowCredentials();
    });
});

builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();
app.UseCors("AllowedOrigins");
var storageConnectionString = builder.Configuration.GetSection("StorageConnectionString").Get<string>() ?? "";

var firesharpSecrets = builder.Configuration.GetSection("FireSharp");
var firebaseService = new FirebaseService(new FirebaseConfig
{
    BasePath = firesharpSecrets.GetValue<string>("BasePath"),
    AuthSecret = firesharpSecrets.GetValue<string>("AuthSecret"),
});

// Authentication middleware using userToken cookie. Public path: /upload-testimony/v2
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? string.Empty;
    if (path.Equals("/upload-testimony/v2", StringComparison.OrdinalIgnoreCase)
    || path.Equals("/wake-up", StringComparison.OrdinalIgnoreCase)
    || path.Equals("/create-session", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    var userTokenFromCookie = context.Request.Cookies["userToken"];
    var sessionKey = context.Request.Query["sessionKey"].ToString();

    if (string.IsNullOrWhiteSpace(userTokenFromCookie) || string.IsNullOrWhiteSpace(sessionKey))
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsync("Missing userToken");
        return;
    }

    var authorized = firebaseService.AuthourizeUserBySessionKey(sessionKey, userTokenFromCookie);
    if (!authorized)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }

    await next();
});

app.MapPost("/upload-testimony/v2", async Task<IResult> (HttpRequest request) => await UploadVideoV2.Run(request, videoType: Constants.VideoTypes.Testimonial, constring: storageConnectionString, firebaseService: firebaseService));
app.MapGet("/create-session", async Task<IResult> (HttpRequest request) => await CreateSession.Run(request, constring: storageConnectionString, firebaseService: firebaseService));
app.MapGet("/force-update", async Task<IResult> (HttpRequest request) => await ForceUpdateSessionStatus.Run(request, constring: storageConnectionString, firebaseService: firebaseService));

app.MapGet("/getgif/{fileName}", async (HttpRequest request, HttpResponse response, string fileName) => await GetGif.Run(request, response, fileName, storageConnectionString, firebaseService));
app.MapGet("/download-session-files", async Task<IResult> (HttpRequest request) => await DownloadSessionFiles.Run(request, storageConnectionString, firebaseService));
app.MapGet("/start-final-video-processing", async Task<IResult> (HttpRequest request) => await StartFinalVideoProcessing.Run(request, storageConnectionString, firebaseService));
app.MapGet("/download-final-video", async Task<IResult> (HttpRequest request) => await DownloadFinalVideo.Run(request, storageConnectionString, firebaseService));
app.MapGet("/video/{fileName}/download", async Task<IResult> (HttpRequest request, string fileName) => await DownloadSingleVideo.Run(request, fileName, storageConnectionString, firebaseService));

app.MapDelete("/delete-session", async Task<IResult> (HttpRequest request) => await DeleteSession.Run(request, storageConnectionString, firebaseService));
app.MapDelete("/delete-video/{fileName}", async Task<IResult> (HttpRequest request, string fileName) => await DeleteVideo.Run(request, fileName, storageConnectionString, firebaseService));

app.MapGet("/retry/{id}", async Task<IResult> (string id, HttpRequest request) => await RetryVideoProcessing.Run(request, id, constring: storageConnectionString, firebaseService: firebaseService));
app.MapGet("/wake-up", IResult () => Results.Ok());

app.Run();
