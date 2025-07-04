import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, get, onValue } from 'firebase/database';
import NotFoundMessage from '../components/NotFoundMessage';
import LoadingFullScreen from '../components/LoadingFullScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import VideoRecorder from '../components/VideoRecorder';
import WaitingScreen from '../components/WaitingScreen';
import Footer from '../components/Footer';
import type PublicVitneboks from '../types/PublicVitneboks';

export default function TestimonyPage() {
  const { vitneboksId } = useParams();
  const [vitneboks, setVitneboks] = useState<PublicVitneboks | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

  const handleStart = () => setStarted(true);
  const handleRecordingFinished = () => {
    setStarted(false);
    setWaiting(true);
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setCurrentQuestionIndex(0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      {!started && !waiting && (
        <WelcomeScreen onStart={handleStart} title={vitneboks.title}/>
      )}

      {started && !waiting && (
        <VideoRecorder
          question={currentQuestion}
          onFinish={handleRecordingFinished}
          uid={vitneboks.uid}
          vitneboksId={vitneboksId!}
        />
      )}

      {waiting && (
        <WaitingScreen seconds={5} setWaiting={setWaiting} />
      )}

      <Footer />
    </div>
  );
}
