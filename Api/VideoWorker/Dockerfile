# Build context must be the Api/ directory (so Shared/ is included):
#   docker build -f VideoWorker/Dockerfile -t video-worker .
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Shared/ Shared/
COPY VideoWorker/ VideoWorker/
RUN dotnet publish VideoWorker/VideoWorker.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime:8.0
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg fonts-liberation && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "VideoWorker.dll"]
