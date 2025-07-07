import { useEffect, useRef, useState } from 'react';
import { GetRecordingConstrains, videoExtension } from '../utils';
import type Question from '../types/Question';
import { uploadVideoToProcessor } from '../videoProcessorService';
import tvTestImage from '../assets/tv-test.png';

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
    <div  className="flex flex-col items-center justify-center fixed bg-black top-0 left-0 right-0 bottom-0 flex-1 ">
      <img src={tvTestImage} className='w-full image'  />
      <video ref={videoRef} className="fixed top-0 bottom-0 min-h-full max-w-none" />
        <div className='rounded p-4 pl-6 pr-8 fixed flex top-16 left-16 text-4xl'
          style={{
              background: "rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                padding: "2px",
                borderRadius: "50%",
                backgroundColor: "red",
                animation: "blinker 1s infinite",
              }}
            />
            <div style={{ color: "white" }}>REC</div>
          </div>
          <div className='rounded p-4 fixed top-16 right-16 text-4xl'
            style={{
              background: "rgba(0,0,0,0.5)",
            }}
          >
            {countdown}
          </div>
      <h2 className="fixed bottom-24 text-6xl font-semibold ">{question.text}</h2>
    </div>
  );
}
