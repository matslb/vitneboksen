/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Helper function to download a file from a blob response
 * Extracts filename from Content-Disposition header or uses a fallback
 */
async function downloadFileFromResponse(response: Response, fallbackFileName: string = "download") {
  const blob = await response.blob();
  
  // Try to extract filename from Content-Disposition header
  let fileName = fallbackFileName;
  const contentDisposition = response.headers.get("Content-Disposition");
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = fileNameMatch[1].replace(/['"]/g, "");
      // Decode URI if needed
      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // If decoding fails, use as is
      }
    }
  }
  
  // Create a temporary URL for the blob
  const blobUrl = URL.createObjectURL(blob);
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

export async function uploadVideoToProcessor(videoBlob: Blob, vitneboksId: string, question: string, extension: string = "webm") {
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;

  if (!API_URL) {
    throw new Error("Video processor API URL or key is not set in environment variables");
  }

  const formData = new FormData();
  const handleBeforeUnload = (e: any) => {
  e.preventDefault();
  e.returnValue = "";
};
  formData.append("video", videoBlob, `${vitneboksId}.${extension}`);
  formData.append("sub", question);

  window.addEventListener("beforeunload", handleBeforeUnload);
  await fetch(`${API_URL}upload-testimony/v2?sessionKey=${vitneboksId}`, {
    method: "POST",
    body: formData
  });

  window.removeEventListener("beforeunload", handleBeforeUnload);
}

export async function startFinalVideoProcessing(vitneboksId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}start-final-video-processing?sessionKey=${vitneboksId}`;
    await fetch(urlWithQueryParam, { 
      method: "GET"
    });
}

export async function deleteVitneboks(vitneboksId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}delete-session?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "DELETE"
  });
  return response.ok;
}

export async function forceUpdateVitneboksStatus(vitneboksId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}force-update?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "Get"
  });
  return response.ok;
}

export async function createSession(vitneboksId: string, uid: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}create-session?sessionKey=${vitneboksId}&uid=${uid}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "Get"
  });
  return response.ok;
}

export async function downloadFinalVideo(vitneboksId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}download-final-video?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET"
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  
  await downloadFileFromResponse(response, `${vitneboksId}-final-video.mp4`);
}

export async function downloadSessionFiles(vitneboksId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}download-session-files?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET"
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download session files: ${response.statusText}`);
  }
  
  await downloadFileFromResponse(response, `${vitneboksId}-session-files.zip`);
}

export async function deleteVideo(vitneboksId: string, videoId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}delete-video/${videoId}?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "DELETE"
  });
  return response.ok;
}

export async function downloadSingleVideo(vitneboksId: string, videoId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}video/${videoId}/download?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET"
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  
  await downloadFileFromResponse(response, `${vitneboksId}-${videoId}.mp4`);
}

export async function retryFailedVideo(vitneboksId: string, videoId: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}retry/${videoId}?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "GET"
  });
  return response.ok;
}

export async function wakeUpServer(){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}wake-up`;
  const response = await fetch(urlWithQueryParam, { method: "GET" });
  return response.ok;
}
