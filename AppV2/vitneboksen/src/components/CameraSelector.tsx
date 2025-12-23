import { useEffect, useRef, useState } from 'react';

interface CameraSelectorProps {
  onRecordStart: (deviceId: string) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

const isBackCamera = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  return lowerLabel.includes('back') || lowerLabel.includes('facing back');
};

export default function CameraSelector({ onRecordStart }: CameraSelectorProps) {
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Kamera ${device.deviceId.slice(0, 8)}`,
          }));
        
        setDevices(videoDevices);
        setDevicesLoaded(true);
        
        // Find and set default back camera
        const backCamera = findBackCamera(videoDevices);
        if (backCamera) {
          setSelectedDeviceId(backCamera.deviceId);
        } else if (videoDevices.length > 0) {
          // Fallback to first camera if no back camera found
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error loading devices:', error);
        setDevicesLoaded(true);
      }
    };

    loadDevices();
  }, []);

  const findBackCamera = (videoDevices: VideoDevice[]): VideoDevice | undefined => {
    return videoDevices.find(device => isBackCamera(device.label));
  };

  const switchCamera = () => {
    if (devices.length <= 1) return;
    
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  useEffect(() => {
    if (!selectedDeviceId || !devicesLoaded) return;

    const startPreview = async () => {
      try {
        // Stop previous stream if exists
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Determine if we should mirror: mirror if it's NOT a back camera OR if there's only one camera
        const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId) || false;
        const shouldMirror = devices.length === 1 || (selectedDevice && !isBackCamera(selectedDevice.label));
        setIsMirrored(shouldMirror);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(err => console.warn('Video play error:', err));
        }
      } catch (error) {
        console.error('Error starting preview:', error);
      }
    };

    startPreview();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId, devicesLoaded, devices]);

  const handleRecordStart = () => {
    if (selectedDeviceId) {
      onRecordStart(selectedDeviceId);
    }
  };

  if (!devicesLoaded) {
    return (
      <div className="flex flex-col items-center justify-center fixed top-0 left-0 right-0 bottom-0 bg-primary-bg">
        <p className="text-xl text-center px-4">Laster kamera...</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center fixed top-0 left-0 right-0 bottom-0 bg-primary-bg">
        <p className="text-xl text-center px-4">Ingen kameraer funnet. Vennligst sjekk at kameraet er tilkoblet.</p>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black flex flex-col">
      <video 
        ref={videoRef} 
        className={`fixed top-0 bottom-0 min-h-full max-w-[100vw] object-cover w-full h-full ${isMirrored ? '-scale-x-100' : ''}`}
        autoPlay
        playsInline
      />
      
      {/* Switch camera button - bottom right */}
      {devices.length > 1 && (
        <button
          onClick={switchCamera}
          className="fixed bottom-24 right-4 z-50 bg-black bg-opacity-75 rounded-full p-3 hover:bg-opacity-100 transition-all"
          aria-label="Bytt kamera"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Record button - center bottom */}
      <button
        onClick={handleRecordStart}
        disabled={!selectedDeviceId}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 rounded-full p-4 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        aria-label="Start recording"
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer black ring */}
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke="black"
            strokeWidth="4"
            fill="white"
          />
          {/* Inner red circle */}
          <circle
            cx="32"
            cy="32"
            r="18"
            fill="red"
          />
        </svg>
      </button>
    </div>
  );
}

