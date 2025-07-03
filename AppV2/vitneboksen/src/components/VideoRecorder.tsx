import { useEffect, useRef, useState } from 'react';
import { GetRecordingConstrains, GetSupportedMimeType, videoExtension } from '../utils';
import type Question from '../types/Question';

interface VideoRecorderProps {
  question: Question;
  vitneboksId: string;
  onFinish: () => void;
}

export default function VideoRecorder({ question, vitneboksId, onFinish }: VideoRecorderProps) {
  const [countdown, setCountdown] = useState(question.recordingDuration);
  const [recording, setRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const startRecording = async () => {
      const stream = await navigator.mediaDevices.getUserMedia(GetRecordingConstrains());
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      const recorder = new MediaRecorder(stream,  {
          videoBitsPerSecond: 2500000,
        });
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: videoExtension });
        uploadToServer(blob);
      };

      recorder.start();
      setRecording(true);
      startCountdown();
    };

    const startCountdown = () => {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

const stopRecording = () => {
  mediaRecorderRef.current?.stop();
  setRecording(false);
  const stream = videoRef.current?.srcObject as MediaStream | null;
  stream?.getTracks().forEach(t => t.stop());
  onFinish();
};

    startRecording();
  }, [question, onFinish]);

  const uploadToServer = (blob: Blob) => {
    // implement actual upload logic here, e.g. Firebase Storage
    console.log('Uploading video blob for vitneboks', vitneboksId);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-4">{question.text}</h2>
      <video ref={videoRef} className="w-full max-w-2xl rounded mb-4" />
      <p className="text-lg">Opptak stopper automatisk om {countdown} sekunder…</p>
    </div>
  );
}
