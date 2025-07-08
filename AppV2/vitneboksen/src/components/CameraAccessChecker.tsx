import { useEffect, useState } from "react";

export default function CameraAndMicAccessChecker() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        if (!navigator.permissions) {
          setHasAccess(false);
          setChecking(false);
          return;
        }

        const camera = await navigator.permissions.query({ name: "camera" as PermissionName });
        const mic = await navigator.permissions.query({ name: "microphone" as PermissionName });

        const bothGranted = camera.state === "granted" && mic.state === "granted";
        setHasAccess(bothGranted);

        const onChange = () => {
          const updated = camera.state === "granted" && mic.state === "granted";
          setHasAccess(updated);
        };

        camera.onchange = onChange;
        mic.onchange = onChange;

      } catch (err) {
        console.error("Permission check failed", err);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    }

    checkPermissions();
  }, []);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasAccess(true);
      location.reload();
    } catch (err) {
      setHasAccess(false);
    }
  };

  if (checking || hasAccess) {
    return null; 
  }

  return (
      <div className="flex flex-col bg-danger shadow-xl rounded items-center p-4 flex gap-2 w-full">
        <h2 className="text-lg text-black text-center ">
          Vitneboksen trenger tilgang til kamera og mikrofon
        </h2>
        <button
          onClick={requestAccess}
          className="bg-primary-button text-black min-w-25 h-12 rounded hover:text-white hover:bg-secondary-bg"
        >
          Gi tilgang
        </button>
      </div>
  );
}
