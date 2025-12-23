/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import NotFoundMessage from '../components/NotFoundMessage';
import LoadingFullScreen from '../components/LoadingFullScreen';
import ActionShotWelcomeScreen from '../components/ActionShotWelcomeScreen';
import ActionShotVideoRecorder from '../components/ActionShotVideoRecorder';
import ActionShotThankYouScreen from '../components/ActionShotThankYouScreen';
import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import { mapVitneboks, canRecordAgain } from '../utils';

export default function ActionShotPage() {
  const { vitneboksId } = useParams();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [thankYouWaiting, setThankYouWaiting] = useState(false);
  const [userName, setUserName] = useState('');
  const divRef = useRef<HTMLDivElement>(null);

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
      const canRecord = canRecordAgain(vitneboksId, 'actionshot');
      if (!canRecord) {
        setThankYouWaiting(true);
      }
    }
  }, [vitneboksId]);

  if (loading) return <LoadingFullScreen />;
  if (!vitneboks) return <NotFoundMessage />;

  const handleStart = (name: string) => {
    setUserName(name);
    setStarted(true);
  };

  const handleRecordingFinished = () => {
    setStarted(false);
    setThankYouWaiting(true);
  };


  const isClosed = !vitneboks.isOpen || 
                   vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started || 
                   (vitneboks.sessionStorageUsage) >= vitneboks.maxStorage;

  return (
    <div ref={divRef} className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      {isClosed ? (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-3xl">
          Kom tilbake senere. Her er det dessverre stengt 😓
        </div>
      ) : (
        <>
          {!started && !thankYouWaiting && (
            <ActionShotWelcomeScreen onStart={handleStart} title={vitneboks.title} />
          )}
        </>
      )}

      {started && !thankYouWaiting && (
        <ActionShotVideoRecorder
          userName={userName}
          vitneboksId={vitneboksId!}
          onFinish={handleRecordingFinished}
        />
      )}

      {thankYouWaiting && vitneboks.isOpen && (
        <ActionShotThankYouScreen seconds={30} setWaiting={setThankYouWaiting} />
      )}
    </div>
  );
}

