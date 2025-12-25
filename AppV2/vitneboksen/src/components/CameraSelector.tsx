import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface CameraSelectorProps {
  onRecordStart: (deviceId: string) => void;
}

// For the rear/back camera
const backCameraConstraints = {
  video: {
    facingMode: { exact: 'environment' } as const,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  }
};

// For the front/selfie camera
const frontCameraConstraints = {
  video: {
    facingMode: 'user' as const,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  }
};

type FacingMode = 'user' | 'environment';

interface CameraDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export default function CameraSelector({ onRecordStart }: CameraSelectorProps) {
  const [searchParams] = useSearchParams();
  const isDebugMode = searchParams.has('debug');
  
  const [currentFacingMode, setCurrentFacingMode] = useState<FacingMode>('environment');
  const [hasFrontCamera, setHasFrontCamera] = useState(false);
  const [hasBackCamera, setHasBackCamera] = useState(false);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [allDevices, setAllDevices] = useState<CameraDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check which cameras are available
  useEffect(() => {
    const checkCameras = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true });

        // If debug mode, enumerate all devices
        if (isDebugMode) {
          const deviceList = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = deviceList
            .filter(device => device.kind === 'videoinput')
            .map(device => ({
              deviceId: device.deviceId,
              label: device.label || `Kamera ${device.deviceId.slice(0, 8)}`,
              groupId: device.groupId,
            }));
          setAllDevices(videoDevices);
        }

        let frontAvailable = false;
        let backAvailable = false;

        // Check if front camera is available
        try {
          const frontStream = await navigator.mediaDevices.getUserMedia(frontCameraConstraints);
          frontStream.getTracks().forEach(track => track.stop());
          frontAvailable = true;
          setHasFrontCamera(true);
        } catch {
          setHasFrontCamera(false);
        }

        // Check if back camera is available
        try {
          const backStream = await navigator.mediaDevices.getUserMedia(backCameraConstraints);
          backStream.getTracks().forEach(track => track.stop());
          backAvailable = true;
          setHasBackCamera(true);
        } catch {
          setHasBackCamera(false);
        }

        // Set default to back camera if available, otherwise front
        if (backAvailable) {
          setCurrentFacingMode('environment');
        } else if (frontAvailable) {
          setCurrentFacingMode('user');
        }

        setDevicesLoaded(true);
      } catch (error) {
        console.error('Error checking cameras:', error);
        setDevicesLoaded(true);
      }
    };

    checkCameras();
  }, [isDebugMode]);

  const switchCamera = () => {
    // Only switch if both cameras are available
    if (hasFrontCamera && hasBackCamera) {
      setCurrentFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  // Start preview when facing mode changes
  useEffect(() => {
    if (!devicesLoaded) return;

    const startPreview = async () => {
      try {
        // Stop previous stream if exists
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const constraints = currentFacingMode === 'user' 
          ? frontCameraConstraints 
          : backCameraConstraints;

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Get deviceId from the stream for debug mode
        if (isDebugMode) {
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          setCurrentDeviceId(settings.deviceId || null);
        }

        // Mirror front camera, don't mirror back camera
        setIsMirrored(currentFacingMode === 'user');

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
  }, [currentFacingMode, devicesLoaded, isDebugMode]);

  const handleRecordStart = () => {
    if (streamRef.current) {
      // Get deviceId from the current stream
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const deviceId = settings.deviceId;
      
      if (deviceId) {
        onRecordStart(deviceId);
      }
    }
  };

  if (!devicesLoaded) {
    return (
      <div className="flex flex-col items-center justify-center fixed top-0 left-0 right-0 bottom-0 bg-primary-bg">
        <p className="text-xl text-center px-4">Laster kamera...</p>
      </div>
    );
  }

  if (!hasFrontCamera && !hasBackCamera) {
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
      
      {/* Debug panel */}
      {isDebugMode && (
        <div className="fixed top-4 left-4 z-50 bg-black bg-opacity-90 rounded-lg p-4 max-w-md max-h-[80vh] overflow-y-auto">
          <h3 className="text-white text-lg font-bold mb-3">Camera Devices (Debug Mode)</h3>
          <div className="space-y-2">
            {allDevices.length === 0 ? (
              <p className="text-white text-sm">No devices found</p>
            ) : (
              allDevices.map((device) => {
                const isSelected = device.deviceId === currentDeviceId;
                return (
                  <div
                    key={device.deviceId}
                    className={`p-3 rounded border-2 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400'
                        : 'bg-gray-800 border-gray-600'
                    }`}
                  >
                    <div className="text-white text-sm font-semibold mb-1">
                      {device.label}
                      {isSelected && (
                        <span className="ml-2 text-blue-200">✓ Selected</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs font-mono break-all">
                      {device.deviceId}
                    </div>
                    {device.groupId && (
                      <div className="text-gray-500 text-xs font-mono mt-1">
                        Group: {device.groupId.slice(0, 16)}...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="text-white text-sm">
              <div>Current Facing Mode: <span className="font-mono">{currentFacingMode}</span></div>
              <div className="mt-1">Mirrored: <span className="font-mono">{isMirrored ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Switch camera button - bottom right */}
      {hasFrontCamera && hasBackCamera && (
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
        disabled={!streamRef.current}
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

