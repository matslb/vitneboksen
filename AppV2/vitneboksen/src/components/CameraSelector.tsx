import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface CameraSelectorProps {
  onRecordStart: (deviceId: string) => void;
}

// For the rear/back camera
const backCameraConstraints = {
  video: {
    // NOTE: `exact` will throw OverconstrainedError on some devices/browsers.
    // Use `ideal` and handle fallback in code.
    facingMode: { ideal: 'environment' } as const,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  }
};

// For the front/selfie camera
const frontCameraConstraints = {
  video: {
    facingMode: { ideal: 'user' } as const,
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

interface DebugError {
  timestamp: number;
  name: string;
  message: string;
  context: string;
  error?: any;
}

function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach(track => track.stop());
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
  const [errors, setErrors] = useState<DebugError[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Helper function to add error to debug state
  const addDebugError = (error: any, context: string) => {
    if (isDebugMode) {
      const debugError: DebugError = {
        timestamp: Date.now(),
        name: error?.name || 'UnknownError',
        message: error?.message || String(error),
        context,
        error,
      };
      setErrors(prev => [...prev, debugError]);
    }
  };

  // Check which cameras are available
  useEffect(() => {
    const checkCameras = async () => {
      try {
        // Request permission first. IMPORTANT: stop this probe stream, otherwise some devices/browsers
        // keep the camera hardware locked and subsequent getUserMedia calls fail (NotReadableError).
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });

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

        // Release the probe stream before doing further getUserMedia calls.
        stopStream(permissionStream);

        let frontAvailable = false;
        let backAvailable = false;

        // Check if front camera is available
        try {
          const frontStream = await navigator.mediaDevices.getUserMedia(frontCameraConstraints);
          stopStream(frontStream);
          frontAvailable = true;
          setHasFrontCamera(true);
        } catch (error) {
          addDebugError(error, 'Checking front camera');
          setHasFrontCamera(false);
        }

        // Check if back camera is available
        try {
          const backStream = await navigator.mediaDevices.getUserMedia(backCameraConstraints);
          stopStream(backStream);
          backAvailable = true;
          setHasBackCamera(true);
        } catch (error) {
          addDebugError(error, 'Checking back camera');
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
        const err = error as any;
        console.error('Error checking cameras:', err?.name, err?.message, err);
        addDebugError(error, 'Initial camera check');
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
        stopStream(streamRef.current);

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
          videoRef.current.play().catch(err => {
            console.warn('Video play error:', err);
            addDebugError(err, 'Video playback');
          });
        }
      } catch (error) {
        const err = error as any;
        console.error('Error starting preview:', err?.name, err?.message, err);
        addDebugError(error, 'Starting preview');
      }
    };

    startPreview();

    return () => {
      stopStream(streamRef.current);
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
          
          {/* Errors section */}
          {errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-red-600">
              <h4 className="text-red-400 text-sm font-bold mb-2">Errors ({errors.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {errors.map((err, index) => (
                  <div
                    key={index}
                    className="bg-red-900 bg-opacity-50 border border-red-600 rounded p-2"
                  >
                    <div className="text-red-200 text-xs font-semibold mb-1">
                      [{new Date(err.timestamp).toLocaleTimeString()}] {err.context}
                    </div>
                    <div className="text-red-300 text-xs font-mono mb-1">
                      {err.name}: {err.message}
                    </div>
                    {err.error && (
                      <details className="text-red-400 text-xs mt-1">
                        <summary className="cursor-pointer">Details</summary>
                        <pre className="mt-1 text-xs overflow-auto max-h-32 bg-black bg-opacity-50 p-2 rounded">
                          {(() => {
                            try {
                              // Try to stringify with a replacer to handle non-serializable values
                              return JSON.stringify(err.error, ( _ , value) => {
                                if (value instanceof Error) {
                                  return {
                                    name: value.name,
                                    message: value.message,
                                    stack: value.stack,
                                  };
                                }
                                return value;
                              }, 2);
                            } catch {
                              // Fallback to string representation
                              return String(err.error);
                            }
                          })()}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setErrors([])}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              >
                Clear errors
              </button>
            </div>
          )}
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
