/* eslint-disable @typescript-eslint/no-explicit-any */

import type PublicVitneboks from "./types/PublicVitneboks";
import type Question from "./types/Question";

export const dateStringToLocal = (dateString: string) => {
    const date = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const dateStringToUtc = (dateString: string) => {
    const date = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

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
  const questions = vitneboksRaw?.questions 
  ? ( Object.entries(vitneboksRaw.questions).map(([id, q]: [string, any]) => ({ ...q, id })) as Question[])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];  return {
    ...vitneboksRaw,
    createdOn: new Date(vitneboksRaw.createdOn).toLocaleDateString(),
    questions,
  };
}

export const mapPublicVitneboks = (vitneboksRaw: any) => {
  const questions = vitneboksRaw?.questions 
  ? ( Object.entries(vitneboksRaw.questions).map(([id, q]: [string, any]) => ({ ...q, id })) as Question[])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  return {
    ...vitneboksRaw,
    questions: questions,
  } as PublicVitneboks;
}

export const generateVitneboksId = () => {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
