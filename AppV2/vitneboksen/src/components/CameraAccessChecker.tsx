import { useEffect, useState } from "react";

export default function CameraAndMicAccessChecker() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      try {
        // Attempt to get a stream with no intention to use it — just to check access.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setHasAccess(true);
      } catch (err) {
        console.error("Media access check failed", err);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    }

    checkAccess();
  }, []);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasAccess(true);
      location.reload();
    } catch {
      setHasAccess(false);
    }
  };

  if (checking || hasAccess) {
    return null;
  }

  return (
    <div className="flex flex-col bg-danger shadow-xl rounded items-center p-4 gap-2 w-full">
      <h2 className="text-lg text-black text-center">
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
