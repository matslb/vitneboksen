import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, onValue } from 'firebase/database';
import NotFoundMessage from '../components/NotFoundMessage';
import LoadingFullScreen from '../components/LoadingFullScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import VideoRecorder from '../components/VideoRecorder';
import WaitingScreen from '../components/WaitingScreen';
import Footer from '../components/Footer';
import type PublicVitneboks from '../types/PublicVitneboks';
import ThankYouScreen from '../components/TankYouScreen';
import CameraAccessChecker from '../components/CameraAccessChecker';

export default function TestimonyPage() {
  const { vitneboksId } = useParams();
  const [vitneboks, setVitneboks] = useState<PublicVitneboks | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [thankYouWaiting, setThankYouWaiting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  const fetchVitneboks = async () => {
      setLoading(true);
      const db = getDatabase();
      const vitneboksRef = ref(db, `publicVitnebokser/${vitneboksId}`);
      onValue(vitneboksRef, (snapshot) => {
        setVitneboks(snapshot.val());
        setLoading(false);
      });
  };
    
  useEffect(() => {
    if (!vitneboksId) return;
    fetchVitneboks();
  }, [vitneboksId]);

  if (loading) return <LoadingFullScreen />;
  if (!vitneboks) return <NotFoundMessage />;

  const questions = Object.values(vitneboks.questions) || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleStart = () => {
    setWaiting(true);
    setStarted(true);
  }
  const handleRecordingFinished = () => {
    setStarted(false);
    setThankYouWaiting(true);
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setCurrentQuestionIndex(0);
    }
  };

function enterFullscreen(element: HTMLElement) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) { // Safari
    (element as any).webkitRequestFullscreen();
  } else if ((element as any).mozRequestFullScreen) { // Firefox
    (element as any).mozRequestFullScreen();
  } else if ((element as any).msRequestFullscreen) { // IE/Edge
    (element as any).msRequestFullscreen();
  }
}
 const handleEnterFullscreen = () => {
    if (divRef.current) {
      enterFullscreen(divRef.current);
      setIsFullScreen(true);
    }
  };
  return (
    <div ref={divRef} className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      {!isFullScreen && !waiting && !thankYouWaiting && !started &&
        <button
        className="fixed top-2 left-2 bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
        onClick={handleEnterFullscreen}
        >Fullskjerm</button>
      }
      <CameraAccessChecker />
      {!started && (!waiting && !thankYouWaiting ) && (
        <WelcomeScreen onStart={handleStart} recordingTime={currentQuestion.recordingDuration} title={vitneboks.title}/>
      )}
    

      {waiting &&  (
        <WaitingScreen seconds={3} setWaiting={setWaiting} />
      )}

      { started && !waiting  && !thankYouWaiting && (
        <VideoRecorder
          question={currentQuestion}
          onFinish={handleRecordingFinished}
          uid={vitneboks.uid}
          vitneboksId={vitneboksId!}
        />
      )
      }
      {thankYouWaiting &&  (
        <ThankYouScreen seconds={30} setWaiting={setThankYouWaiting} />
      )}
      { !started && !waiting && !thankYouWaiting &&
        <Footer />
      }
    </div>
  );
}
