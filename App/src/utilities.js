export const GetRecordingConstrains = async () => {
  let constraints = {
    video: {
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

  return constraints;
};

export const videoExtension = "webm";

export const GetSupportedMimeType = async () => {
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

export const prepFile = (recordedChunks, type) => {
  const blob = new Blob(recordedChunks);
  const now = new Date();
  const fileName = `vitneboksen_${now
    .toISOString()
    .replace(/[:.]/g, "-")}.${type}`;
  return { blob, fileName };
};

export const generateVitneboksId = () => {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
