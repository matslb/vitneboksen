import { useEffect, useRef, useState } from 'react';
import { GetRecordingConstrains, GetSupportedMimeType, saveRecordingCompletion } from '../utils';
import type Question from '../types/Question';
import { uploadVideoToProcessor } from '../vitneboksService';
import { getDatabase, ref, set, update } from 'firebase/database';
import fixWebmDuration from 'webm-duration-fix';

interface VideoRecorderProps {
  question: Question;
  vitneboksId: string;
  onFinish: () => void;
  hideQuestionText?: boolean;
  deviceId?: string;
}

const isBackCamera = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  return lowerLabel.includes('back') || lowerLabel.includes('facing back');
};

export default function VideoRecorder({ question, vitneboksId, onFinish, hideQuestionText, deviceId }: VideoRecorderProps) {
  const [countdown, setCountdown] = useState(question.recordingDuration);
  const [isMirrored, setIsMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const db = getDatabase();

  const setActiveSessionInFirebase = (isRecording: boolean, activeQuestion?: number) => {
    const sessionRef = ref(db, `/activeSessions/${vitneboksId}`);
    // If hideQuestionText is true (ActionShot), only update isRecording to preserve activeQuestion
    if (hideQuestionText) {
      update(sessionRef, { isRecording });
    } else {
      // For regular questions, update both isRecording and activeQuestion
      const sessionData: { isRecording: boolean; activeQuestion?: number } = { isRecording };
      if (activeQuestion !== undefined) {
        sessionData.activeQuestion = activeQuestion;
      }
      set(sessionRef, sessionData);
    }
  };

  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      setActiveSessionInFirebase(true, question.order);
      const baseConstraints = GetRecordingConstrains();
      // If deviceId is provided, add it to the video constraints
      const constraints: MediaStreamConstraints = {
        ...baseConstraints,
        video: deviceId && baseConstraints.video
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
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      const hasOnlyOneCamera = videoDevices.length === 1;
      
      // Check if this is a back camera
      const isBack = trackLabel ? isBackCamera(trackLabel) : false;
      const shouldMirror = hasOnlyOneCamera || !isBack;
      setIsMirrored(shouldMirror);

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
              // Persist the last answered question index (only if not hideQuestionText)
              if (mounted) {
                setActiveSessionInFirebase(false, question.order);
              }
              if (mounted) onFinish();
            });
          } else {
            // For MP4 (Safari), upload directly without duration fix
            uploadToServer(blob, extension);
            // Persist the last answered question index (only if not hideQuestionText)
            if (mounted) {
              setActiveSessionInFirebase(false, question.order);
            }
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
      setActiveSessionInFirebase(false, question.order);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [question, onFinish, deviceId, hideQuestionText]);

  const uploadToServer = async (blob: Blob, extension: string) => {
    await uploadVideoToProcessor(blob, vitneboksId, question.text, extension);
    // Save recording completion timestamp and question to localStorage
    saveRecordingCompletion(vitneboksId, question, 30);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center fixed bg-black top-0 left-0 right-0 bottom-0 flex-1 ">
        <video ref={videoRef} className={`fixed inset-0 w-full h-full object-cover ${isMirrored ? '-scale-x-100' : ''}`} />
        {!hideQuestionText && (
          <h2
            style={{
              background: "rgba(0,0,0,0.55)",
            }}
            className="fixed bottom-32 2xl:text-5xl font-semibold p-6 w-90% max-w-6xl text-3xl rounded text-shadow-s">{question.text}</h2>
        )}
      </div>
      <div className='fixed md:inset-8 inset-1 lb m-auto left-0 right-0 flex w-90% max-w-7xl flex justify-between 1 p-8'>
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
