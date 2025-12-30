# Use .NET 8.0 runtime as base image
FROM mcr.microsoft.com/dotnet/runtime:8.0

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy published application
COPY publish/ .

# Set entrypoint
ENTRYPOINT ["dotnet", "FinalVideoJob.dll"]

