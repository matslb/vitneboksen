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

var firebaseService = new FirebaseService(new FirebaseConfig
{
    BasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath"),
    AuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret"),
});


app.MapPost("/upload-testimony/v2", async Task<IResult> (HttpRequest request) => await UploadVideoV2.Run(request, videoType: Constants.VideoTypes.Testimonial, constring: storageConnectionString, firebaseService: firebaseService));

app.MapGet("/download-session-files", async Task<IResult> (HttpRequest request) => await DownloadSessionFiles.Run(request, storageConnectionString));

app.MapGet("/start-final-video-processing", async Task<IResult> (HttpRequest request) => await StartFinalVideoProcessing.Run(request, storageConnectionString, firebaseService));

app.MapGet("/download-final-video", async Task<IResult> (HttpRequest request) => await DownloadFinalVideo.Run(request, storageConnectionString, firebaseService));

app.MapDelete("/delete-session", async Task<IResult> (HttpRequest request) => await DeleteSession.Run(request, storageConnectionString));


app.Run();
