import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { type Vitneboks } from '../types/Vitneboks';
import type PublicVitneboks from '../types/PublicVitneboks';

import LoadingFullScreen from '../components/LoadingFullScreen';
import Footer from '../components/Footer';
import { deleteVitneboks } from '../videoProcessorService';
import Header from '../components/Header';
import ToggleSwitch from '../components/ToggleSwitch';
import QuestionList from '../components/QuestionList';
import { mapVitneboks } from '../utils';

export default function VitneboksDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const auth = getAuth();
  const db = getDatabase();

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
      isOpen: vitneboks.isOpen
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

    const vbRef = ref(db, `${user.uid}/vitnebokser/${id}`);
    const publicRef = ref(db, `publicVitnebokser/${id}`);
    remove(vbRef);
    remove(publicRef);

    await deleteVitneboks(id);
    navigate('/admin');
  };

  return (
    <>
      <div className='bg-primary-bg min-h-screen'>
        <div className="flex flex-col items-center text-primary-text">
          <Header backButtonPath={"/admin/"} />
          <div className='mb-8 bg-secondary-bg w-full max-w-5xl p-8 shadow-md rounded'>
            <div className='flex justify-between'>
              <p className="opacity-80">Opprettet: {vitneboks.createdOn.toLocaleString()}</p>
              <ToggleSwitch label={vitneboks.isOpen ? "Åpen" : "Stengt"} checked={vitneboks.isOpen} onChange={(checked) => set(ref(db, `${user.uid}/vitnebokser/${id}/isOpen`), checked)} />
            </div>
            <h2 className="text-xl font-semibold my-4">Tittel</h2>
            <label htmlFor="title" className='hidden'>Tittel</label>
            <p className="text-3xl font-bold my-4  ">
              <input type='text' name='title' maxLength={45} className='bg-white/10 rounded shadow-md p-2 w-[100%] text-left' value={vitneboks.title} onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/title`), e.currentTarget.value)} />
            </p>
            <QuestionList vitneBoksId={vitneboks.id} userId={user.uid} questions={vitneboks.questions} />
            <button
              onClick={handleDeleteVitneboks}
              className="bg-danger text-white px-4 py-2 mt-8 rounded hover:bg-danger-200 mb-8"
            >
              Slett vitneboks
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
