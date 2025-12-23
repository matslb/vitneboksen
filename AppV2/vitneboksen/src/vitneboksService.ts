/* eslint-disable @typescript-eslint/no-explicit-any */
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

export async function startFinalVideoProcessing(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}start-final-video-processing?sessionKey=${vitneboksId}`;
    await fetch(urlWithQueryParam, { 
      method: "GET",
      headers: {
        "userToken": userToken
      }
    });
}

export async function deleteVitneboks(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}delete-session?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "DELETE",
    headers: {
      "userToken": userToken
    }
  });
  return response.ok;
}

export async function forceUpdateVitneboksStatus(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}force-update?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "Get",
    headers: {
      "userToken": userToken
    }
  });
  return response.ok;
}

export async function createSession(vitneboksId: string, uid: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}create-session?sessionKey=${vitneboksId}&uid=${uid}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "Get",
    headers: {
      "userToken": userToken
    }
  });
  return response.ok;
}

export async function downloadFinalVideo(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}download-final-video?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET",
    headers: {
      "userToken": userToken
    }
  });
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export async function downloadSessionFiles(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}download-session-files?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET",
    headers: {
      "userToken": userToken
    }
  });
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export async function GetGifFromVideoId(vitneboksId: string, videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}get-gif/${videoId}?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "Get",
    headers: {
      "userToken": userToken
    }
  });
  return response.ok;
}

export async function deleteVideo(vitneboksId: string, videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}delete-video/${videoId}?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "DELETE",
    headers: {
      "userToken": userToken
    }
  });
  return response.ok;
}

export async function downloadSingleVideo(vitneboksId: string,videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}video/${videoId}/download?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET",
    headers: {
      "userToken": userToken
    }
  });
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export async function retryFailedVideo(vitneboksId: string, videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}retry/${videoId}?sessionKey=${vitneboksId}`;
  const response = await fetch(urlWithQueryParam, { 
    method: "GET",
    headers: {
      "userToken": userToken
    }
  });
  return response.ok;
}

export async function wakeUpServer(){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}wake-up`;
  const response = await fetch(urlWithQueryParam, { method: "GET" });
  return response.ok;
}
