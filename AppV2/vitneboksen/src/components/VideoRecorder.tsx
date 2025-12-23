import { useEffect, useRef, useState } from 'react';
import { GetRecordingConstrains, GetSupportedMimeType } from '../utils';
import type Question from '../types/Question';
import { uploadVideoToProcessor } from '../vitneboksService';
import { getDatabase, ref, set } from 'firebase/database';
import fixWebmDuration from 'webm-duration-fix';

interface VideoRecorderProps {
  question: Question;
  vitneboksId: string;
  onFinish: () => void;
  hideQuestionText?: boolean;
}

export default function VideoRecorder({ question, vitneboksId, onFinish, hideQuestionText }: VideoRecorderProps) {
  const [countdown, setCountdown] = useState(question.recordingDuration);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const db = getDatabase();

  const setIsRecordingStateInFirebase = (isRecording: boolean) => {
    set(ref(db, `/activeSessions/${vitneboksId}`), isRecording);
  };

  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      setIsRecordingStateInFirebase(true);
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
        setTimeout(() => {
          // Use the MediaRecorder's actual mimeType, or fall back to detected type
          const mimeType = recorder.mimeType || GetSupportedMimeType() || 'video/webm';
          const isWebM = mimeType.startsWith('video/webm');
          const extension = isWebM ? 'webm' : 'mp4';
          
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // Only fix WebM duration - MP4 files don't need this fix
          if (isWebM) {
            fixWebmDuration(blob).then((fixedBlob) => {
              uploadToServer(fixedBlob, extension);
              if (mounted) onFinish();
            });
          } else {
            // For MP4 (Safari), upload directly without duration fix
            uploadToServer(blob, extension);
            if (mounted) onFinish();
          }
        }, 100);
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
      setIsRecordingStateInFirebase(false);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [question, onFinish]);

  const uploadToServer = async (blob: Blob, extension: string) => {
    await uploadVideoToProcessor(blob, vitneboksId, question.text, extension);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center fixed bg-black top-0 left-0 right-0 bottom-0 flex-1 ">
        <video ref={videoRef} className="fixed top-0 bottom-0 min-h-full max-w-[100vw] -scale-x-100" />
        {!hideQuestionText && (
          <h2
            style={{
              background: "rgba(0,0,0,0.55)",
            }}
            className="fixed bottom-32 2xl:text-5xl font-semibold p-6 w-90% max-w-6xl text-3xl rounded text-shadow-s">{question.text}</h2>
        )}
      </div>
      <div className='fixed top-8 bottom-8 left-8 right-8 m-auto left-0 right-0 flex w-90% max-w-7xl flex justify-between 1 p-8'>
        <div className='absolute top-0 left-0 rounded-tl border-l-3 border-t-3 h-60 w-60 border-black opacity-55'> </div>
        <div className='absolute top-0 right-0 rounded-tr border-r-3 border-t-3 h-60 w-60 border-black opacity-55'> </div>
        <div className='absolute bottom-0 left-0 rounded-bl border-l-3 border-b-3 h-60 w-60 border-black opacity-55'> </div>
        <div className='absolute bottom-0 right-0 rounded-br border-r-3 border-b-3 h-60 w-60 border-black opacity-55'> </div>

        <div>
          <div className='rounded h-18 p-4 pl-6 pr-6 flex text-4xl'
            style={{
              background: "rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ color: "white" }}>REC</div>
            <div className='p-2 pl-0 m-1 w-5 h-5'
              style={{
                borderRadius: "50%",
                backgroundColor: "red",
                animation: "blinker 1s infinite",
              }}
            />
          </div>
        </div>
        <div className='rounded h-18 p p-4 pl-6 pr-6 flex text-4xl'
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
