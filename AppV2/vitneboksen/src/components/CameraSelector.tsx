import { useEffect, useRef, useState } from 'react';

interface CameraSelectorProps {
  onRecordStart: (deviceId: string) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

const isBackCamera = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  return lowerLabel.includes('back') || lowerLabel.includes('facing back');
};

// Check if a camera is an auxiliary camera (wide-angle, telephoto, etc.)
const isAuxiliaryCamera = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  const auxiliaryKeywords = [
    'wide',
    'ultra wide',
    'ultrawide',
    'telephoto',
    'tele',
    'macro',
    'zoom',
    'periscope',
    'tof',
    'depth',
    'ir',
    'infrared',
  ];
  return auxiliaryKeywords.some(keyword => lowerLabel.includes(keyword));
};

// Get the deviceId of the default front or back camera using facingMode
const getDefaultCameraDeviceId = async (facingMode: 'user' | 'environment'): Promise<string | null> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
    });
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const deviceId = settings.deviceId;
    
    // Stop the stream immediately as we only needed it to identify the device
    stream.getTracks().forEach(track => track.stop());
    
    return deviceId || null;
  } catch (error) {
    console.warn(`Error getting default ${facingMode} camera:`, error);
    return null;
  }
};

// Filter devices to only include main front and back cameras
const filterMainCameras = async (
  allDevices: MediaDeviceInfo[]
): Promise<VideoDevice[]> => {
  // Get default front and back camera deviceIds using facingMode
  const [defaultFrontDeviceId, defaultBackDeviceId] = await Promise.all([
    getDefaultCameraDeviceId('user'),
    getDefaultCameraDeviceId('environment'),
  ]);

  // Filter to video input devices and map to VideoDevice format
  const videoDevices = allDevices
    .filter(device => device.kind === 'videoinput')
    .map(device => ({
      deviceId: device.deviceId,
      label: device.label || `Kamera ${device.deviceId.slice(0, 8)}`,
      groupId: device.groupId,
    }));

  // Filter to only main cameras
  const mainCameras = videoDevices.filter(device => {
    // Exclude auxiliary cameras by label
    if (isAuxiliaryCamera(device.label)) {
      return false;
    }

    // Include if it matches the default front or back camera from facingMode
    if (defaultFrontDeviceId && device.deviceId === defaultFrontDeviceId) {
      return true;
    }
    if (defaultBackDeviceId && device.deviceId === defaultBackDeviceId) {
      return true;
    }

    // Fallback: if facingMode didn't work, use label-based detection
    // but still exclude auxiliary cameras
    if (!defaultFrontDeviceId && !defaultBackDeviceId) {
      // Check if it's a front or back camera by label
      const lowerLabel = device.label.toLowerCase();
      const isFront = lowerLabel.includes('front') || lowerLabel.includes('facing front') || lowerLabel.includes('user');
      const isBack = isBackCamera(device.label);
      return isFront || isBack;
    }

    return false;
  });

  // Group by groupId and pick the first device from each group
  // This ensures we only get one camera per physical device group
  const deviceMap = new Map<string, VideoDevice>();
  const seenGroupIds = new Set<string>();

  for (const device of mainCameras) {
    if (device.groupId) {
      // If we've already seen this group, skip (prefer the first one)
      if (seenGroupIds.has(device.groupId)) {
        continue;
      }
      seenGroupIds.add(device.groupId);
    }
    deviceMap.set(device.deviceId, device);
  }

  return Array.from(deviceMap.values());
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
        
        // Filter to only main front and back cameras
        const mainCameras = await filterMainCameras(deviceList);
        
        setDevices(mainCameras);
        setDevicesLoaded(true);
        
        // Find and set default back camera
        const backCamera = findBackCamera(mainCameras);
        if (backCamera) {
          setSelectedDeviceId(backCamera.deviceId);
        } else if (mainCameras.length > 0) {
          // Fallback to first camera if no back camera found
          setSelectedDeviceId(mainCameras[0].deviceId);
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
    // Only switch if we have more than one main camera (should be max 2: front and back)
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

