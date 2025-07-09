using FireSharp.Config;
using Shared;
using Vitneboksen_Api;
using Vitneboksen_Api.Controllers;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = new[]
{
    "http://localhost:5173",
    "https://vitneboksen.no",
    "https://vitneboksen.web.app"
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
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

app.MapPost("/upload-testimony/v2", async Task<IResult> (HttpRequest request) => await UploadVideoV2.Run(request, videoType: Constants.VideoTypes.Testimonial, constring: storageConnectionString, firebaseService: firebaseService));
app.MapGet("/create-session", async Task<IResult> (HttpRequest request) => await CreateSession.Run(request, constring: storageConnectionString, firebaseService: firebaseService));
app.MapGet("/force-update", async Task<IResult> (HttpRequest request) => await ForceUpdateSessionStatus.Run(request, constring: storageConnectionString, firebaseService: firebaseService));

app.MapGet("/getgif/{fileName}", async (HttpRequest request, HttpResponse response, string fileName) => await GetGif.Run(request, response, fileName, storageConnectionString, firebaseService));
app.MapGet("/download-session-files", async Task<IResult> (HttpRequest request) => await DownloadSessionFiles.Run(request, storageConnectionString, firebaseService));
app.MapGet("/start-final-video-processing", async Task<IResult> (HttpRequest request) => await StartFinalVideoProcessing.Run(request, storageConnectionString, firebaseService));
app.MapGet("/download-final-video", async Task<IResult> (HttpRequest request) => await DownloadFinalVideo.Run(request, storageConnectionString, firebaseService));
app.MapDelete("/delete-session", async Task<IResult> (HttpRequest request) => await DeleteSession.Run(request, storageConnectionString, firebaseService));
app.MapDelete("/delete-video/{fileName}", async Task<IResult> (HttpRequest request, string fileName) => await DeleteVideo.Run(request, fileName, storageConnectionString, firebaseService));

app.Run();
