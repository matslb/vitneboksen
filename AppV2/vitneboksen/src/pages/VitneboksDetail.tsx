import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import type PublicVitneboks from '../types/PublicVitneboks';

import LoadingFullScreen from '../components/LoadingFullScreen';
import Footer from '../components/Footer';
import { deleteVitneboks, forceUpdateVitneboksStatus } from '../videoProcessorService';
import Header from '../components/Header';
import ToggleSwitch from '../components/ToggleSwitch';
import QuestionList from '../components/QuestionList';
import { mapVitneboks, vitneboksTimeRemaining } from '../utils';
import VideoStats from '../components/VideoStats';
import GenerateVideoButton from '../components/GenerateVideoButton';

export default function VitneboksDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const auth = getAuth();
  const db = getDatabase();

  useEffect(() => {
    if (vitneboks == null) return;
    onValue(ref(db, `/activeSessions/${vitneboks.id}`), (snapshot) => {
      const data: boolean = snapshot.val();
      setIsRecording(data);
    });
  }, [db, vitneboks]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (vitneboks === null) return;

    const publicVitneboksRef = ref(db, `publicVitnebokser/${vitneboks.id}`);
    set(publicVitneboksRef, {
      questions: vitneboks.questions,
      title: vitneboks.title,
      uid: user!.uid,
      isOpen: vitneboks.isOpen,
      finalVideoProcessingStatus: vitneboks.finalVideoProcessingStatus
    } as PublicVitneboks);
  }, [vitneboks]);

  useEffect(() => {
    if (!user?.uid || !id) return;

    const vbRef = ref(db, `${user.uid}/vitnebokser/${id}`);
    onValue(vbRef, (snapshot) => {
      const data: Vitneboks = snapshot.val();
      if (!data) return;
      setVitneboks(mapVitneboks(data));
    });
  }, [user, id, db]);

  if (!vitneboks || !user) return <LoadingFullScreen />;

  const handleDeleteVitneboks = async () => {
    if (!user?.uid || !id) return;

    if (!confirm("Er du sikker på at du vil slette denne vitneboksen? Dette kan ikke angres.")) return;

    remove(ref(db, `${user.uid}/vitnebokser/${id}`));
    remove(ref(db, `publicVitnebokser/${id}`));
    remove(ref(db, `activeSessions/${id}`));

    await deleteVitneboks(id);
    navigate('/admin');
  };
  console.log(vitneboks.videosToBeProcessed);

  return (
    <>
      <div className='bg-primary-bg min-h-screen'>
        <div className="flex flex-col items-center text-primary-text">
          <Header backButtonPath={"/admin/"} />
          <div className='relative mb-8 bg-secondary-bg w-full max-w-5xl p-8 shadow-md rounded'>
            {isRecording &&
              <div
                className="bg-black/40 flex text-white px-2 py-1 rounded-bl rounded-tr absolute top-0 right-0"
              >
                <div>REC</div>
                <div className='p-1 m-1 w-2 h-2'
                  style={{
                    borderRadius: "50%",
                    backgroundColor: "red",
                    animation: "blinker 1s infinite",
                  }}
                >
                </div>
              </div>
            }
            <div className='flex justify-between mb-4 mt-2'>
              <VideoStats completed={vitneboks.completedVideos} inProgress={vitneboks.videosToBeProcessed} />
              <GenerateVideoButton Vitneboks={vitneboks} />
              <ToggleSwitch label={vitneboks.isOpen ? "Åpen" : "Stengt"} checked={vitneboks.isOpen} onChange={(checked) => set(ref(db, `${user.uid}/vitnebokser/${id}/isOpen`), checked)} />
            </div>
            <h2 className="text-xl font-semibold my-4">Tittel</h2>
            <label htmlFor="title" className='hidden'>Tittel</label>
            <p className="text-3xl font-bold my-4  ">
              <input type='text' name='title' maxLength={45} className='bg-white/10 rounded shadow-md p-2 w-[100%] text-left' value={vitneboks.title} onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/title`), e.currentTarget.value)} />
            </p>
            <QuestionList vitneBoksId={vitneboks.id} userId={user.uid} questions={vitneboks.questions} />
            <div className='flex justify-between items-end gap-4'>
              {(vitneboks.finalVideoProcessingStatus === FinalVideoStatus.started || vitneboks.videosToBeProcessed > 0 || isRecording) &&
                <div className='flex flex-col align-left gap-4'>
                  <span>
                    Tror du noe har gått galt?
                  </span>
                  <button
                    onClick={() => forceUpdateVitneboksStatus(vitneboks.id)}
                    className="bg-primary-button w-45 text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
                  >
                    Tving statussjekk
                  </button>
                </div>
              }
              <p className="opacity-80">
                {vitneboks.deletionFromDate &&
                  <>Slettes automatisk om {vitneboksTimeRemaining(vitneboks.deletionFromDate)}</>
                }
              </p>
              <button
                onClick={handleDeleteVitneboks}
                className="bg-danger text-white px-4 py-2 rounded"
              >
                Slett vitneboks
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
