import { useEffect, useRef, useState } from "react";
import {
  GetRecordingConstrains,
  GetSupportedMimeType,
  saveRecordingCompletion,
} from "../utils";
import type Question from "../types/Question";
import { uploadVideoToProcessor } from "../vitneboksService";
import { getDatabase } from "firebase/database";
import fixWebmDuration from "webm-duration-fix";
import SpinnerIcon from "./SpinnerIcon";
import { SetPublicVitneboksIsRecording } from "../types/publicVitneboks";

interface VideoRecorderProps {
  question: Question;
  vitneboksId: string;
  onFinish: () => void;
  hideQuestionText?: boolean;
  deviceId?: string;
}

const isBackCamera = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  return lowerLabel.includes("back") || lowerLabel.includes("facing back");
};

export default function VideoRecorder({
  question,
  vitneboksId,
  onFinish,
  hideQuestionText,
  deviceId,
}: VideoRecorderProps) {
  const [countdown, setCountdown] = useState(question.recordingDuration);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const db = getDatabase();

  useEffect(() => {
    const startRecording = async () => {
      SetPublicVitneboksIsRecording(db, vitneboksId, true);
      const baseConstraints = GetRecordingConstrains();
      // If deviceId is provided, add it to the video constraints
      const constraints: MediaStreamConstraints = {
        ...baseConstraints,
        video:
          deviceId && baseConstraints.video
            ? {
              ...(baseConstraints.video as MediaTrackConstraints),
              deviceId: { exact: deviceId },
            }
            : baseConstraints.video,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Determine if we should mirror: mirror if it's NOT a back camera OR if there's only one camera
      const videoTrack = stream.getVideoTracks()[0];
      const trackLabel = videoTrack.label;

      // Get all video devices to check if there's only one camera
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(
        (device) => device.kind === "videoinput"
      );
      const hasOnlyOneCamera = videoDevices.length === 1;

      // Check if this is a back camera
      const isBack = trackLabel ? isBackCamera(trackLabel) : false;
      const shouldMirror = hasOnlyOneCamera || !isBack;
      setIsMirrored(shouldMirror);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;

        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .catch((err) => console.warn("Video play error:", err));
            resolve();
          };
        });
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        videoBitsPerSecond: 2500000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setTimeout(() => {
          const mimeType =
            recorder.mimeType || GetSupportedMimeType() || "video/webm";
          const isWebM = mimeType.startsWith("video/webm");
          const extension = isWebM ? "webm" : "mp4";

          const blob = new Blob(chunksRef.current, { type: mimeType });

          if (isWebM) {
            fixWebmDuration(blob).then((fixedBlob) => {
              uploadToServer(fixedBlob, extension);
            });
          } else {
            uploadToServer(blob, extension);
          }
        }, 100);
      };

      recorder.start();
      setCountdown(question.recordingDuration);
      startCountdown();
    };

    const startCountdown = () => {
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const stopRecording = () => {
      SetPublicVitneboksIsRecording(db, vitneboksId, false);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current?.state === "recording")
        mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    startRecording();

    return () => {
      SetPublicVitneboksIsRecording(db, vitneboksId, false);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current?.state === "recording")
        mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [question, onFinish, deviceId, hideQuestionText]);

  const uploadToServer = async (blob: Blob, extension: string) => {

    if (!hideQuestionText) {
      uploadVideoToProcessor(blob, vitneboksId, question.text, extension);
      onFinish();
      return;
    }
    setIsUploading(true);
    await uploadVideoToProcessor(blob, vitneboksId, question.text, extension);
    saveRecordingCompletion(vitneboksId, question, 30);
    setIsUploading(false);
    onFinish();
  };

  if (isUploading) {
    return (
      <div className="bg-primary-bg flex m-2 flex-col items-center justify-center fixed bg-black top-0 left-0 right-0 bottom-0 flex-1 ">
        <h2 className="text-5xl font-bold">Du var skikkelig flink!</h2>
        <div className="scale-150 my-16">
          <SpinnerIcon />
        </div>
        <div className="text-3xl">Laster opp video...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center fixed bg-black top-0 left-0 right-0 bottom-0 flex-1 ">
        <video
          ref={videoRef}
          className={`fixed inset-0 w-full h-full object-cover ${isMirrored ? "-scale-x-100" : ""
            }`}
        />
        {!hideQuestionText && (
          <h2
            style={{
              background: "rgba(0,0,0,0.55)",
            }}
            className="fixed bottom-32 2xl:text-5xl font-semibold p-6 w-90% max-w-6xl text-3xl rounded text-shadow-s"
          >
            {question.text}
          </h2>
        )}
      </div>
      <div className="fixed md:inset-8 inset-1 lb m-auto left-0 right-0 flex w-90% max-w-7xl flex justify-between md:p-8 p-2">
        <div className="absolute top-0 left-0 rounded-tl md:border-l-3 md:border-t-3 h-60 w-60 border-black opacity-55">
          {" "}
        </div>
        <div className="absolute top-0 right-0 rounded-tr md:border-r-3 md:border-t-3 h-60 w-60 border-black opacity-55">
          {" "}
        </div>
        <div className="absolute bottom-0 left-0 rounded-bl md:border-l-3 md:border-b-3 h-60 w-60 border-black opacity-55">
          {" "}
        </div>
        <div className="absolute bottom-0 right-0 rounded-br md:border-r-3 md:border-b-3 h-60 w-60 border-black opacity-55">
          {" "}
        </div>

        <div>
          <div
            className="rounded h-18 p-4 pl-6 pr-6 flex text-4xl"
            style={{
              background: "rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ color: "white" }}>REC</div>
            <div
              className="p-2 pl-0 m-1 w-5 h-5"
              style={{
                borderRadius: "50%",
                backgroundColor: "red",
                animation: "blinker 1s infinite",
              }}
            />
          </div>
        </div>
        <div
          className="rounded h-18 p p-4 pl-6 pr-6 flex text-4xl"
          style={{
            background: "rgba(0,0,0,0.55)",
          }}
        >
          T - {countdown}
        </div>
      </div>
    </>
  );
}
