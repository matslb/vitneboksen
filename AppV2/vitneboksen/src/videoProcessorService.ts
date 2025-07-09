/* eslint-disable @typescript-eslint/no-explicit-any */
export async function uploadVideoToProcessor(videoBlob: Blob, vitneboksId: string, uid: string, question: string) {
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
  const response = await fetch(`${API_URL}upload-testimony/v2?sessionKey=${vitneboksId}&uid=${uid}`, {
    method: "POST",
    body: formData
  });

  window.removeEventListener("beforeunload", handleBeforeUnload);
  console.log(response);
}

export async function startFinalVideoProcessing(vitneboksId: string){
    const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
    const urlWithQueryParam = `${API_URL}start-final-video-processing?sessionKey=${vitneboksId}`;
     await fetch(urlWithQueryParam, { method: "GET" });
}

export async function deleteVitneboks(vitneboksId: string){
    const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
    const urlWithQueryParam = `${API_URL}delete-session?sessionKey=${vitneboksId}`;
    const response = await fetch(urlWithQueryParam, { method: "DELETE" });
    return response.ok;
}

export async function forceUpdateVitneboksStatus(vitneboksId: string){
    const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
    const urlWithQueryParam = `${API_URL}force-update?sessionKey=${vitneboksId}`;
    const response = await fetch(urlWithQueryParam, { method: "Get" });
    return response.ok;
}

export async function createSession(vitneboksId: string, uid: string){
    const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
    const urlWithQueryParam = `${API_URL}create-session?sessionKey=${vitneboksId}&uid=${uid}`;
    const response = await fetch(urlWithQueryParam, { method: "Get" });
    return response.ok;
}

export async function downloadFinalVideo(vitneboksId: string){
    const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
    const urlWithQueryParam = `${API_URL}download-final-video?sessionKey=${vitneboksId}`;
    window.open(urlWithQueryParam, '_blank');
}

export async function downloadSessionFiles(vitneboksId: string){
    const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;
    const urlWithQueryParam = `${API_URL}download-session-files?sessionKey=${vitneboksId}`;
    window.open(urlWithQueryParam, '_blank');
}