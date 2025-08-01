/* eslint-disable @typescript-eslint/no-explicit-any */

import type Question from "./types/Question";

export const dateStringToLocal = (dateString: string) => {
    const date = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
export const vitneboksTimeRemaining = (dateString: string) => {
  const startDate = new Date(dateString);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + 60);

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if(days > 0){
    return `${days} dager og ${hours} timer pikk`;
  }
    return `${hours} timer`;
};


export const GetRecordingConstrains = () => {
    return { video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: {
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: false,
    },
    mimeType: GetSupportedMimeType(),
  };
};

export const videoExtension = "webm";

export const GetSupportedMimeType = () => {
  let mimeType = "";
  const preferredTypes = [
    "video/webm",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type;
      break;
    }
  }
  if (mimeType === "") {
    alert(
      "Din nettleser støtter ikke den nødvendige video-kodeken. Oppdater eller bruk en annen nettleser."
    );
    return null;
  }
  return mimeType;
};

export const mapVitneboks = (vitneboksRaw: any) => {
  if(vitneboksRaw == undefined || vitneboksRaw == null) return null;
  const questions = vitneboksRaw!.questions 
  ? ( Object.entries(vitneboksRaw.questions).map(([id, q]: [string, any]) => ({ ...q, id })) as Question[])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  return {
    ...vitneboksRaw,
    createdOn: vitneboksRaw.createdOn,
    questions,
    completedVideoIds: vitneboksRaw?.completedVideoIds ? Object.values(vitneboksRaw?.completedVideoIds) : []
  };
}

export const generateVitneboksId = () => {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateStrongToken = (): string =>  {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
