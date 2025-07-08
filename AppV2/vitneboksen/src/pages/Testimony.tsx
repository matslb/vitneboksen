/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import NotFoundMessage from '../components/NotFoundMessage';
import LoadingFullScreen from '../components/LoadingFullScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import VideoRecorder from '../components/VideoRecorder';
import WaitingScreen from '../components/WaitingScreen';
import type PublicVitneboks from '../types/PublicVitneboks';
import ThankYouScreen from '../components/TankYouScreen';
import { mapPublicVitneboks } from '../utils';
import type Question from '../types/Question';
import { FinalVideoStatus } from '../types/Vitneboks';

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

  useEffect(() => {
    const db = getDatabase();
    const vitneboksRef = ref(db, `publicVitnebokser/${vitneboksId}`);

    if (!started) {
      const unsubscribe = onValue(vitneboksRef, (snapshot) => {
        const vitneboks = mapPublicVitneboks(snapshot.val());
        vitneboks.questions = filterQuestions(vitneboks.questions);
        setVitneboks(vitneboks);
        setLoading(false);
      });

      return () => { //unmounts
        unsubscribe();
      };
    } else {
      return () => {
        off(vitneboksRef);
      };
    }
  }, [vitneboksId, started]);

  const filterQuestions = (questions: Question[]) => {
    const now = Date.now();
    return questions.filter(q =>
      q.allwaysActive || ((q.activeFrom && Date.parse(q.activeFrom) <= now) && (q.activeTo && Date.parse(q.activeTo) >= now))
    )
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (vitneboks === null || started || waiting) return;
      vitneboks!.questions = filterQuestions(vitneboks!.questions);
      setVitneboks(vitneboks);
      if (vitneboks.questions.findIndex(q => q.id === currentQuestion?.id) === -1) {
        setCurrentQuestionIndex(vitneboks.questions[0].order);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [vitneboks]);


  if (loading) return <LoadingFullScreen />;
  if (!vitneboks) return <NotFoundMessage />;

  const handleStart = () => {
    setWaiting(true);
    setStarted(true);
  }
  const handleRecordingFinished = () => {
    setStarted(false);
    setThankYouWaiting(true);
    setNextQuestion();
  };

  const setNextQuestion = () => {
    if (currentQuestion == undefined)
      setCurrentQuestionIndex(vitneboks.questions[0].order);

    const nextQuestion = vitneboks.questions.find(q => q.order > currentQuestion!.order);
    if (nextQuestion != undefined)
      setCurrentQuestionIndex(nextQuestion.order);
    else
      setCurrentQuestionIndex(vitneboks.questions[0].order);
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

  const currentQuestion = vitneboks.questions.find(q => q.order === currentQuestionIndex);

  return (
    <div ref={divRef} className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      {!isFullScreen && !waiting && !thankYouWaiting && !started &&
        <button
          className="fixed top-2 left-2 bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
          onClick={handleEnterFullscreen}
        >Fullskjerm</button>
      }
      {!vitneboks.isOpen || vitneboks.questions.length === 0 || vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started ?
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-3xl">
          Kom tilbake senere. Her er det dessverre stengt 😓
        </div>
        :
        <>
          {!started && !waiting && !thankYouWaiting && currentQuestion != null &&
            <WelcomeScreen onStart={handleStart} recordingTime={currentQuestion!.recordingDuration} title={vitneboks.title} />
          }
        </>
      }

      {waiting && (
        <WaitingScreen seconds={3} withBeep={false} setWaiting={setWaiting} />
      )}

      {started && !waiting && !thankYouWaiting && currentQuestion && (
        <VideoRecorder
          question={currentQuestion}
          onFinish={handleRecordingFinished}
          uid={vitneboks.uid}
          vitneboksId={vitneboksId!}
        />
      )
      }
      {thankYouWaiting && vitneboks.isOpen && (
        <ThankYouScreen seconds={30} setWaiting={setThankYouWaiting} />
      )}
    </div>
  );
}
