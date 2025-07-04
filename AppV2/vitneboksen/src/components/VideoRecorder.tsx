import { useEffect, useRef, useState } from 'react';
import { GetRecordingConstrains, videoExtension } from '../utils';
import type Question from '../types/Question';
import { uploadVideoToProcessor } from '../videoProcessorService';

interface VideoRecorderProps {
  question: Question;
  vitneboksId: string;
  uid: string;
  onFinish: () => void;
}

export default function VideoRecorder({ question, vitneboksId, uid, onFinish }: VideoRecorderProps) {
  const [countdown, setCountdown] = useState(question.recordingDuration);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      const stream = await navigator.mediaDevices.getUserMedia(GetRecordingConstrains());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;

        await new Promise<void>(resolve => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current?.play().catch(err => console.warn('Video play error:', err));
            resolve();
          };
        });
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { videoBitsPerSecond: 2500000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: videoExtension });
        uploadToServer(blob);
        if (mounted) onFinish();
      };

      recorder.start();
      setCountdown(question.recordingDuration);
      startCountdown();
    };

    const startCountdown = () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
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
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };

    startRecording();

    return () => {
      mounted = false;
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [question, onFinish]);

  const uploadToServer = async (blob: Blob) => {
    console.log('Uploading video blob for vitneboks', vitneboksId);
    await uploadVideoToProcessor(blob, vitneboksId, uid, question.text);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-4">{question.text}</h2>
      <video ref={videoRef} className="w-full max-w-2xl rounded mb-4" />
      <p className="text-lg">Opptak stopper automatisk om {countdown} sekunder…</p>
    </div>
  );
}
