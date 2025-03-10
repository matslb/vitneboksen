using Shared;
using Vitneboksen_Api;
using Vitneboksen_Api.Controllers;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
                      {
                          policy.AllowAnyOrigin()
                                .AllowAnyMethod()
                                .AllowAnyHeader();
                      });
});

builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();
app.UseCors();
var storageConnectionString = builder.Configuration.GetSection("StorageConnectionString").Get<string>() ?? "";

app.MapPost("/upload-testimony", async Task<IResult> (HttpRequest request) => await UploadVideo.Run(request, videoType: Constants.VideoTypes.Testimonial, constring: storageConnectionString));

app.MapPost("/upload-actionshot", async Task<IResult> (HttpRequest request) => await UploadVideo.Run(request, videoType: Constants.VideoTypes.ActionShot, constring: storageConnectionString));

app.MapGet("/get-session", async Task<IResult> (HttpRequest request) => await GetSession.Run(request, storageConnectionString));

app.MapGet("/get-shared-session", async Task<IResult> (HttpRequest request) => await GetSharedSession.Run(request, storageConnectionString));

app.MapGet("/download-session-files", async Task<IResult> (HttpRequest request) => await DownloadSessionFiles.Run(request, storageConnectionString));

app.MapGet("/start-final-video-processing", async Task<IResult> (HttpRequest request) => await StartFinalVideoProcessing.Run(request, storageConnectionString));

app.MapGet("/download-final-video", async Task<IResult> (HttpRequest request) => await DownloadFinalVideo.Run(request, storageConnectionString));

app.MapDelete("/delete-session", async Task<IResult> (HttpRequest request) => await DeleteSession.Run(request, storageConnectionString));

app.MapGet("/set-name", async Task<IResult> (HttpRequest request) => await SetName.Run(request, storageConnectionString));

app.MapPost("/set-questions", async Task<IResult> (HttpRequest request) => await SetQuestions.Run(request, storageConnectionString));

app.Run();
