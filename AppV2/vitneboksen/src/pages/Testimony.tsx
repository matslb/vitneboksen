/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import NotFoundMessage from '../components/NotFoundMessage';
import LoadingFullScreen from '../components/LoadingFullScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import VideoRecorder from '../components/VideoRecorder';
import WaitingScreen from '../components/WaitingScreen';
import ThankYouScreen from '../components/TankYouScreen';
import type Question from '../types/Question';
import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import { mapVitneboks } from '../utils';

export default function TestimonyPage() {
  const { vitneboksId } = useParams();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
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
        const vitneboks = mapVitneboks(snapshot.val());
        if (vitneboks) {
          setFilteredQuestions(filterQuestions(vitneboks.questions));
          setVitneboks(vitneboks);
        }
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
      setFilteredQuestions(filterQuestions(vitneboks!.questions));
      setVitneboks(vitneboks);
      if (filteredQuestions.findIndex(q => q.id === filteredQuestions[currentQuestionIndex]?.id) === -1) {
        setCurrentQuestionIndex(0);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [vitneboks, started, waiting, filteredQuestions, currentQuestionIndex]);


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
      setCurrentQuestionIndex(filteredQuestions[0].order);

    const nextQuestion = filteredQuestions.find(q => q.order > currentQuestion!.order);
    if (nextQuestion != undefined)
      setCurrentQuestionIndex(nextQuestion.order);
    else
      setCurrentQuestionIndex(filteredQuestions[0].order);
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

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  return (
    <div ref={divRef} className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      {!isFullScreen && !waiting && !thankYouWaiting && !started &&
        <button
          className="fixed top-2 left-2 bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
          onClick={handleEnterFullscreen}
        >Fullskjerm</button>
      }
      {!vitneboks.isOpen || filteredQuestions.length === 0 || vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started || (vitneboks.sessionStorageUsage) >= vitneboks.maxStorage ?
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
        <WaitingScreen seconds={3} questionText={currentQuestion.text} withBeep={true} setWaiting={setWaiting} />
      )}

      {started && !waiting && !thankYouWaiting && currentQuestion && (
        <VideoRecorder
          question={currentQuestion}
          onFinish={handleRecordingFinished}
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
