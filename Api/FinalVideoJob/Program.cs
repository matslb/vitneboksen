using Azure.Core;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using FireSharp.Config;
using Shared;
using Shared.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using static Shared.FirebaseService;

namespace FinalVideoJob;

class Program
{
    static async Task<int> Main(string[] args)
    {
        // Get sessionKey from environment variable or command line argument
        var sessionKey = Environment.GetEnvironmentVariable("SESSION_KEY") 
            ?? args.FirstOrDefault();

        if (string.IsNullOrEmpty(sessionKey))
        {
            Console.Error.WriteLine("SESSION_KEY environment variable or command line argument is required");
            return 1;
        }

        Console.WriteLine($"Starting final video processing for session: {sessionKey}");

        try
        {
            // Initialize Blob Service Client with Managed Identity
            var blobEndpoint = Environment.GetEnvironmentVariable("BLOB_ENDPOINT");
            if (string.IsNullOrEmpty(blobEndpoint))
            {
                Console.Error.WriteLine("BLOB_ENDPOINT environment variable is required");
                return 1;
            }

            TokenCredential credential = new DefaultAzureCredential();
            var blobService = new BlobServiceClient(new Uri(blobEndpoint), credential);

            // Initialize Firebase Service
            var firebaseService = new FirebaseService(new FirebaseConfig
            {
                AuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret"),
                BasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath"),
            });

            // Create temp directory
            var tempPath = Path.Combine("/tmp", $"vitne-{Guid.NewGuid()}");
            Directory.CreateDirectory(tempPath);

            try
            {
                // Log temp path and available free space
                try
                {
                    var freeBytes = new DriveInfo("/").AvailableFreeSpace;
                    Console.WriteLine($"Storing temp files at {tempPath}. Free space: {freeBytes / (1024 * 1024)} MB");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Unable to determine available free space: {ex.Message}");
                }

                // Download resources (intro, outro, transition)
                await DownloadResources(blobService, tempPath);
                Console.WriteLine("Resources downloaded successfully");

                // Get session container
                var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
                if (containerClient == null)
                {
                    Console.Error.WriteLine($"Session container not found for sessionKey: {sessionKey}");
                    return 1;
                }

                // Get session name from Firebase
                var sessionName = firebaseService.GetSessionName(sessionKey);
                Console.WriteLine($"Session name fetched from Firebase: {sessionName}");

                // Get all video blobs (excluding final.mp4)
                var blobs = containerClient.GetBlobs()
                    .Where(blob => blob.Name.EndsWith(".mp4") && blob.Name != Constants.FinalVideoFileName)
                    .ToList();

                // Create transitions
                var transitions = await CreateTransitionsFromBlobs(blobs, tempPath);
                Console.WriteLine($"Created {transitions.Count} transitions");

                // Process intro
                var introSourcePath = Path.Combine(tempPath, Constants.IntroFileName);
                var introDestinationPath = Path.Combine(tempPath, "intro-processed.mp4");

                await Helpers.ExecuteFFmpegCommand(FfmpegCommandBuilder.WithText(
                    sourceVideoPath: introSourcePath,
                    subtitles: sessionName,
                    outputVideoPath: introDestinationPath,
                    fontSize: 80,
                    TextPlacement.Centered,
                    startTime: 3.6,
                    endTime: 6));
                Console.WriteLine("Intro processed successfully");

                // Process outro
                var outroSourcePath = Path.Combine(tempPath, Constants.OutroFileName);
                var outroDestinationPath = Path.Combine(tempPath, "outro-processed.mp4");

                await Helpers.ExecuteFFmpegCommand(FfmpegCommandBuilder.WithText(
                    sourceVideoPath: outroSourcePath,
                    subtitles: string.Empty,
                    outputVideoPath: outroDestinationPath,
                    fontSize: 80,
                    TextPlacement.Centered));
                Console.WriteLine("Outro processed successfully");

                // Create file list for concatenation
                var fileListPath = Path.Combine(tempPath, "fileList.txt");
                using (var fileListWriter = new StreamWriter(fileListPath))
                {
                    fileListWriter.WriteLine($"file '{introDestinationPath}'");
                    foreach (var blobItem in blobs)
                    {
                        if (transitions.TryGetValue(blobItem.Name, out var transitionFileName))
                        {
                            fileListWriter.WriteLine($"file '{transitionFileName}'");
                        }
                        await AddBlobToFileList(fileListWriter, containerClient, blobItem.Name, tempPath);
                    }
                    fileListWriter.WriteLine($"file '{outroDestinationPath}'");
                }
                Console.WriteLine("File list created successfully");

                // Concatenate videos
                var concatFilePath = Path.Combine(tempPath, Constants.FinalVideoFileName);
                var concatFfmpegCommand = FfmpegCommandBuilder.ConcatVideos(fileListPath, concatFilePath);
                var result = await Helpers.ExecuteFFmpegCommand(concatFfmpegCommand, timeoutInSeconds: 240);

                if (!result.Success)
                {
                    Console.Error.WriteLine($"Could not concatenate videos: {result.Exception?.Message}");
                    return 1;
                }

                Console.WriteLine("Final video processed successfully");

                // Upload final video
                using var file = File.OpenRead(concatFilePath);
                await containerClient.UploadBlobAsync(Constants.FinalVideoFileName, file);
                Console.WriteLine("Final video uploaded successfully");

                // Update Firebase status
                firebaseService.SetFinalVideoProcessingStatus(sessionKey: sessionKey, FinalVideoProcessingStatus.completed);
                Console.WriteLine("Firebase status updated to completed");

                return 0;
            }
            finally
            {
                // Cleanup temp directory
                if (Directory.Exists(tempPath))
                {
                    Directory.Delete(tempPath, true);
                    Console.WriteLine($"Cleaned up temp directory: {tempPath}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error processing final video: {ex.Message}");
            Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
            return 1;
        }
    }

    private static async Task AddBlobToFileList(StreamWriter fileListWriter, BlobContainerClient containerClient, string blobName, string tempPath)
    {
        var blobClient = containerClient.GetBlobClient(blobName);
        var downloadPath = Path.Combine(tempPath, blobName);
        await blobClient.DownloadToAsync(downloadPath);
        fileListWriter.WriteLine($"file '{downloadPath}'");
    }

    private static async Task DownloadResources(BlobServiceClient blobService, string tempPath)
    {
        var introContainerClient = blobService.GetBlobContainerClient(Constants.ResourceContainer);
        var blobClient = introContainerClient.GetBlobClient(Constants.IntroFileName);
        await blobClient.DownloadToAsync(Path.Combine(tempPath, Constants.IntroFileName));

        var transitionBlobClient = introContainerClient.GetBlobClient(Constants.TransitionFileName);
        await transitionBlobClient.DownloadToAsync(Path.Combine(tempPath, Constants.TransitionFileName));

        var outroblobClient = introContainerClient.GetBlobClient(Constants.OutroFileName);
        await outroblobClient.DownloadToAsync(Path.Combine(tempPath, Constants.OutroFileName));
    }

    private static async Task<Dictionary<string, string>> CreateTransitionsFromBlobs(List<BlobItem> blobs, string tempPath)
    {
        var norwegianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");
        var transitions = new Dictionary<string, string>();

        var filteredElements = blobs
            .Where((blob, i) => i - 1 >= 0).ToList();

        foreach (var blob in filteredElements)
        {
            var fileMetadata = EncodedFileMetaData.GetVideoFileMetaDataFromFileName(blob.Name);
            // Convert the DateTimeOffset to Norwegian time
            var norwegianTime = TimeZoneInfo.ConvertTime(fileMetadata.CreatedOn, norwegianTimeZone);
            var srtContent = $"kl. {norwegianTime.ToString("HH:mm")}";

            var transitionSourcePath = Path.Combine(tempPath, Constants.TransitionFileName);
            var transitionDestinationPath = Path.Combine(tempPath, $"transition-{blob.Name}");

            await Helpers.ExecuteFFmpegCommand(FfmpegCommandBuilder.WithText(
                transitionSourcePath, 
                srtContent, 
                transitionDestinationPath, 
                fontSize: 80, 
                TextPlacement.Centered));

            transitions.Add(blob.Name, transitionDestinationPath);
        }

        return transitions;
    }
}

