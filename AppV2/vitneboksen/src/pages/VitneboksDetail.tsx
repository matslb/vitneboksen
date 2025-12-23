import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { type Vitneboks } from '../types/Vitneboks';

import LoadingFullScreen from '../components/LoadingFullScreen';
import Footer from '../components/Footer';
import { deleteVitneboks, forceUpdateVitneboksStatus } from '../vitneboksService';
import Header from '../components/Header';
import ToggleSwitch from '../components/ToggleSwitch';
import QuestionList from '../components/QuestionList';
import { mapVitneboks, vitneboksTimeRemaining } from '../utils';
import TimelineEditor from '../components/TimelineEditor';

export default function VitneboksDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    set(publicVitneboksRef, vitneboks);
  }, [vitneboks]);

  useEffect(() => {
    if (!user?.uid || !id) return;

    const vbRef = ref(db, `${user.uid}/vitnebokser/${id}`);
    onValue(vbRef, (snapshot) => {
      const data: Vitneboks = snapshot.val();
      if (!data) {
        navigate('/admin');
        return;
      };
      data.failedVideoIds ??= [];
      setVitneboks(mapVitneboks(data));
    });
  }, [user, id, db, navigate]);

  if (!user || !vitneboks) return <LoadingFullScreen />;

  const handleDeleteVitneboks = async () => {
    if (!user?.uid || !id) return;

    if (!confirm("Er du sikker på at du vil slette denne vitneboksen? Dette kan ikke angres.")) return;
    await deleteVitneboks(id);

    remove(ref(db, `${user.uid}/vitnebokser/${id}`));
    remove(ref(db, `publicVitnebokser/${id}`));
    remove(ref(db, `activeSessions/${id}`));

    navigate('/admin');
  };

  return (
    <>
      <div className='bg-primary-bg min-h-screen'>
        <Header backButtonPath={"/admin/"} />
        <div className="flex flex-col items-center text-primary-text p-2">
          <div className='relative mb-8 bg-secondary-bg w-full max-w-5xl p-4 md:p-8 shadow-md rounded'>
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
            <div className='flex justify-end '>
              <ToggleSwitch label={vitneboks.isOpen ? "Åpen" : "Stengt"} checked={vitneboks.isOpen} onChange={(checked) => set(ref(db, `${user.uid}/vitnebokser/${id}/isOpen`), checked)} />
            </div>
            <h2 className="text-xl font-semibold">Tittel</h2>
            <p className="text-3xl font-bold my-4  ">
              <input type='text' name='title' maxLength={45} className='bg-white/10 rounded shadow-md py-6 px-4 w-[100%] text-left' value={vitneboks.title} onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/title`), e.currentTarget.value)} />
            </p>
            <QuestionList vitneBoksId={vitneboks.id} userId={user.uid} questions={vitneboks.questions} />
            <TimelineEditor vitneboks={vitneboks} />
            <div className='flex justify-between items-end gap-4'>
            {searchParams.has('sudo') &&
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
