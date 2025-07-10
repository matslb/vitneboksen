/* eslint-disable @typescript-eslint/no-explicit-any */
export async function uploadVideoToProcessor(videoBlob: Blob, vitneboksId: string, question: string) {
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;

  if (!API_URL) {
    throw new Error("Video processor API URL or key is not set in environment variables");
  }

  const formData = new FormData();
  const handleBeforeUnload = (e: any) => {
  e.preventDefault();
  e.returnValue = "";
};
  formData.append("video", videoBlob, `${vitneboksId}.webm`);
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
  const urlWithQueryParam = `${API_URL}start-final-video-processing?sessionKey=${vitneboksId}&userToken=${userToken}`;
    await fetch(urlWithQueryParam, { method: "GET" });
}

export async function deleteVitneboks(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}delete-session?sessionKey=${vitneboksId}&userToken=${userToken}`;
  const response = await fetch(urlWithQueryParam, { method: "DELETE" });
  return response.ok;
}

export async function forceUpdateVitneboksStatus(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}force-update?sessionKey=${vitneboksId}&userToken=${userToken}`;
  const response = await fetch(urlWithQueryParam, { method: "Get" });
  return response.ok;
}

export async function createSession(vitneboksId: string, uid: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}create-session?sessionKey=${vitneboksId}&uid=${uid}&userToken=${userToken}`;
  const response = await fetch(urlWithQueryParam, { method: "Get" });
  return response.ok;
}

export async function downloadFinalVideo(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}download-final-video?userToken=${userToken}&sessionKey=${vitneboksId}`;
  window.open(urlWithQueryParam, '_blank');
}

export async function downloadSessionFiles(vitneboksId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}download-session-files?sessionKey=${vitneboksId}&userToken=${userToken}`;
  window.open(urlWithQueryParam, '_blank');
}

export async function GetGifFromVideoId(vitneboksId: string, videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}get-gif/${videoId}?sessionKey=${vitneboksId}&userToken=${userToken}`;
  const response = await fetch(urlWithQueryParam, { method: "Get" });
  return response.ok;
}

export async function deleteVideo(vitneboksId: string, videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}delete-video/${videoId}?sessionKey=${vitneboksId}&userToken=${userToken}`;
  const response = await fetch(urlWithQueryParam, { method: "DELETE" });
  return response.ok;
}

export async function downloadSingleVideo(vitneboksId: string,videoId: string, userToken: string){
  const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
  const urlWithQueryParam = `${API_URL}video/${videoId}/download?userToken=${userToken}&sessionKey=${vitneboksId}`;
  window.open(urlWithQueryParam, '_blank');
}

