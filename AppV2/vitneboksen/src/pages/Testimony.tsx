/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, onValue, off } from 'firebase/database';
import NotFoundMessage from '../components/NotFoundMessage';
import LoadingFullScreen from '../components/LoadingFullScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import VideoRecorder from '../components/VideoRecorder';
import WaitingScreen from '../components/WaitingScreen';
import ThankYouScreen from '../components/TankYouScreen';
import type Question from '../types/Question';
import { FinalVideoStatus } from '../types/Vitneboks';
import { getPublicVitneboks, GetPublicVitneboksRef, SetPublicVitneboksActiveQuestionIndex, type PublicVitneboks } from '../types/PublicVitneboks';
import { canRecordAgain } from '../utils';

export default function TestimonyPage() {
  const { vitneboksId } = useParams();
  const [vitneboks, setVitneboks] = useState<PublicVitneboks | null>(null);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [thankYouWaiting, setThankYouWaiting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const db = getDatabase();

  useEffect(() => {
    const vitneboksRef = GetPublicVitneboksRef(db, vitneboksId!);

    if (!started) {
      const unsubscribe = onValue(vitneboksRef, async (snapshot) => {
        const vitneboks = await getPublicVitneboks(snapshot.val());
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
  }, [vitneboksId, started, db]);

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
      if (filteredQuestions.findIndex(q => q.id === filteredQuestions[vitneboks.activeQuestionIndex]?.id) === -1) {
        SetPublicVitneboksActiveQuestionIndex(db, vitneboks.id!, 0);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [vitneboks, started, waiting, filteredQuestions, db]);

  // Check if user can record again on mount and when current question changes
  useEffect(() => {
    if (vitneboks && filteredQuestions[vitneboks!.activeQuestionIndex]?.id) {
      const questionId = filteredQuestions[vitneboks!.activeQuestionIndex].id;
      const canRecord = canRecordAgain(vitneboks.id, questionId);
      if (!canRecord) {
        setThankYouWaiting(true);
      }
    }
  }, [filteredQuestions, vitneboks]);


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
      SetPublicVitneboksActiveQuestionIndex(db, vitneboks!.id!, filteredQuestions[0].order);

    const nextQuestion = filteredQuestions.find(q => q.order > currentQuestion!.order);
    if (nextQuestion != undefined)
      SetPublicVitneboksActiveQuestionIndex(db, vitneboks!.id!, nextQuestion.order);
    else
      SetPublicVitneboksActiveQuestionIndex(db, vitneboks!.id!, filteredQuestions[0].order);
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

  const currentQuestion = filteredQuestions[vitneboks!.activeQuestionIndex];

  return (
    <div ref={divRef} className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      {!isFullScreen && !waiting && !thankYouWaiting && !started &&
        <button
          className="fixed top-2 left-2 bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
          onClick={handleEnterFullscreen}
        >Fullskjerm</button>
      }
      {!vitneboks.isOpen || filteredQuestions.length === 0 || vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started || (vitneboks.sessionStorageUsage ?? 0) >= vitneboks.maxStorage ?
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
          hideQuestionText={false}
        />
      )
      }
      {thankYouWaiting && vitneboks.isOpen && (
        <ThankYouScreen seconds={30} setWaiting={setThankYouWaiting} />
      )}
    </div>
  );
}
