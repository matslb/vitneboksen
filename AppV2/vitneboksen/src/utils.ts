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
    return `${days} dager og ${hours} timer`;
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

// Detect Safari (including iOS and iPadOS)
const isSafari = () => {
  const userAgent = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(userAgent) || 
         /iPad|iPhone|iPod/.test(userAgent);
};

export const GetSupportedMimeType = () => {
  // Safari (macOS, iOS, iPadOS) doesn't support VP8/VP9, use MP4/H.264 instead
  if (isSafari()) {
    const mp4Types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
    ];

    for (const type of mp4Types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
  }

  // For other browsers (Chrome, Firefox, Edge, Android Chrome), use WebM with VP8/VP9
  const preferredTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback: if nothing is supported, show error
  alert(
    "Din nettleser støtter ikke den nødvendige video-kodeken. Oppdater eller bruk en annen nettleser."
  );
  return null;
};

// Get video extension based on the mime type
export const getVideoExtension = () => {
  const mimeType = GetSupportedMimeType();
  if (!mimeType) return "webm"; // fallback
  
  if (mimeType.startsWith("video/mp4")) {
    return "mp4";
  }
  return "webm";
};

// Keep for backward compatibility, but prefer getVideoExtension()
export const videoExtension = getVideoExtension();

export const mapVitneboks = (vitneboksRaw: any) => {
  if(vitneboksRaw == undefined || vitneboksRaw == null) return null;
  const questions = vitneboksRaw!.questions 
  ? ( Object.entries(vitneboksRaw.questions).map(([id, q]: [string, any]) => ({ ...q, id })) as Question[])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  return {
    ...vitneboksRaw,
    createdOn: vitneboksRaw.createdOn,
    questions,
    completedVideoIds: vitneboksRaw?.completedVideoIds ? Object.values(vitneboksRaw?.completedVideoIds) : [],
    sessionStorageUsage: vitneboksRaw?.sessionStorageUsage ?? 0
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

// Detect if device is a phone (not tablet)
export const isPhoneDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for tablets first (these should return false)
  const isTablet = /ipad|android(?!.*mobile)|tablet|playbook|silk/i.test(userAgent);
  if (isTablet) {
    return false;
  }
  
  // Check for mobile devices (phones)
  return /iphone|ipod|android.*mobile|blackberry|windows phone|opera mini|mobile/i.test(userAgent);
}

// Save recording completion timestamp and question to localStorage
export const saveRecordingCompletion = (vitneboksId: string, question: Question, waitTimeSeconds: number = 30): void => {
  const storageKey = `lastRecording_${vitneboksId}_${question.id}`;
  const data = {
    question,
    timestamp: Date.now(),
    waitTimeSeconds,
  };
  localStorage.setItem(storageKey, JSON.stringify(data));
};

// Check if enough time has passed to allow a new recording
export const canRecordAgain = (vitneboksId: string, questionId: string): boolean => {
  const storageKey = `lastRecording_${vitneboksId}_${questionId}`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    return true; // No previous recording, allow recording
  }
  
  try {
    const data = JSON.parse(stored);
    const waitTimeMs = (data.waitTimeSeconds || 30) * 1000;
    const timeSinceRecording = Date.now() - data.timestamp;
    
    return timeSinceRecording >= waitTimeMs;
  } catch (error) {
    console.error('Error parsing stored recording data:', error);
    return true; // On error, allow recording
  }
};

// Get the remaining wait time in seconds
export const getRemainingWaitTime = (vitneboksId: string, questionId: string): number => {
  const storageKey = `lastRecording_${vitneboksId}_${questionId}`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    return 0;
  }
  
  try {
    const data = JSON.parse(stored);
    const waitTimeMs = (data.waitTimeSeconds || 30) * 1000;
    const timeSinceRecording = Date.now() - data.timestamp;
    const remaining = Math.ceil((waitTimeMs - timeSinceRecording) / 1000);
    
    return Math.max(0, remaining);
  } catch (error) {
    console.error('Error parsing stored recording data:', error);
    return 0;
  }
};