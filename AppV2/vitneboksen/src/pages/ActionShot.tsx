/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getDatabase, ref, onValue, off } from "firebase/database";
import NotFoundMessage from "../components/NotFoundMessage";
import LoadingFullScreen from "../components/LoadingFullScreen";
import ActionShotWelcomeScreen from "../components/ActionShotWelcomeScreen";
import CameraSelector from "../components/CameraSelector";
import VideoRecorder from "../components/VideoRecorder";
import ActionShotThankYouScreen from "../components/ActionShotThankYouScreen";
import { FinalVideoStatus, type Vitneboks } from "../types/Vitneboks";
import { mapVitneboks, canRecordAgain } from "../utils";

export default function ActionShotPage() {
  const { vitneboksId } = useParams();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [thankYouWaiting, setThankYouWaiting] = useState(false);
  const [userName, setUserName] = useState("");
  const [savedUserName, setSavedUserName] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined
  );
  const divRef = useRef<HTMLDivElement>(null);

  // Load saved user name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("actionshot_userName");
    if (savedName) {
      setSavedUserName(savedName);
    }
  }, []);

  useEffect(() => {
    const db = getDatabase();
    const vitneboksRef = ref(db, `publicVitnebokser/${vitneboksId}`);

    if (!started) {
      const unsubscribe = onValue(vitneboksRef, (snapshot) => {
        const vitneboks = mapVitneboks(snapshot.val());
        if (vitneboks) {
          setVitneboks(vitneboks);
        }
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } else {
      return () => {
        off(vitneboksRef);
      };
    }
  }, [vitneboksId, started]);

  // Check if user can record again on mount and when vitneboksId changes
  useEffect(() => {
    if (vitneboksId) {
      const canRecord = canRecordAgain(vitneboksId, "actionshot");
      if (!canRecord) {
        setThankYouWaiting(true);
      }
    }
  }, [vitneboksId]);

  if (loading) return <LoadingFullScreen />;
  if (!vitneboks) return <NotFoundMessage />;

  const handleStart = (name: string) => {
    setUserName(name);
    // Save to localStorage
    localStorage.setItem("actionshot_userName", name);
    setSavedUserName(name);
    setStarted(true);
  };

  const handleRecordStart = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setRecording(true);
  };

  const handleRecordingFinished = () => {
    setStarted(false);
    setRecording(false);
    setThankYouWaiting(true);
  };

  const isClosed =
    !vitneboks.isOpen ||
    vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started ||
    vitneboks.sessionStorageUsage >= vitneboks.maxStorage;

  if (isClosed) {
    return;
    <div
      ref={divRef}
      className="flex flex-col min-h-screen bg-primary-bg text-primary-text"
    >
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-3xl">
        Kom tilbake senere. Her er det dessverre stengt 😓
      </div>
    </div>;
  }
  return (
    <div
      ref={divRef}
      className="fixed inset-0 flex flex-col min-h-screen bg-primary-bg text-primary-text"
    >
      {!recording && !thankYouWaiting && (
        <CameraSelector onRecordStart={handleRecordStart} />
      )}
      {!started && !thankYouWaiting && (
        <ActionShotWelcomeScreen
          onStart={handleStart}
          title={vitneboks.title}
          initialName={savedUserName}
        />
      )}
      {started && recording && selectedDeviceId && !thankYouWaiting && (
        <VideoRecorder
          question={{
            id: "actionshot",
            text: `Sendt inn av ${userName}`,
            recordingDuration: 10,
            allwaysActive: true,
            activeFrom: null,
            activeTo: null,
            order: 0,
          }}
          vitneboksId={vitneboksId!}
          onFinish={handleRecordingFinished}
          hideQuestionText={true}
          deviceId={selectedDeviceId}
        />
      )}

      {thankYouWaiting && vitneboks.isOpen && (
        <ActionShotThankYouScreen
          seconds={30}
          setWaiting={setThankYouWaiting}
        />
      )}
    </div>
  );
}
