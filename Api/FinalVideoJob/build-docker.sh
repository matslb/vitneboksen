#!/bin/bash

# Build script for FinalVideoJob Docker image
# Usage: ./build-docker.sh [tag] [registry]
# Example: ./build-docker.sh latest myregistry.azurecr.io

set -e

TAG=${1:-latest}
REGISTRY=${2:-""}

echo "Building FinalVideoJob..."

# Build the .NET application
dotnet publish -c Release -o bin/Release/net8.0/publish

# Build Docker image
if [ -z "$REGISTRY" ]; then
    IMAGE_NAME="finalvideo-worker:${TAG}"
    echo "Building image: ${IMAGE_NAME}"
    docker build -t "${IMAGE_NAME}" .
else
    IMAGE_NAME="${REGISTRY}/finalvideo-worker:${TAG}"
    echo "Building image: ${IMAGE_NAME}"
    docker build -t "${IMAGE_NAME}" .
    echo "To push to registry, run:"
    echo "  docker push ${IMAGE_NAME}"
fi

echo "Build complete: ${IMAGE_NAME}"

