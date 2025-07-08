import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, push, set, update, remove } from 'firebase/database';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import {type Vitneboks} from '../types/Vitneboks';
import type Question from '../types/Question';
import type PublicVitneboks from '../types/PublicVitneboks';

import ActiveFromToPicker from '../components/ActiveFromToDatePicker';
import LoadingFullScreen from '../components/LoadingFullScreen';
import { dateStringToLocal } from '../utils';
import Footer from '../components/Footer';
import { deleteVitneboks } from '../videoProcessorService';
import Header from '../components/Header';
import ToggleSwitch from '../components/ToggleSwitch';

export default function VitneboksDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newRecordingDuration, setNewRecordingDuration] = useState(10);
  const [alwaysActive, setAlwaysActive] = useState(true);
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
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
    if(vitneboks === null) return;

    const publicVitneboksRef = ref(db, `publicVitnebokser/${vitneboks.id}`);
    set(publicVitneboksRef, {
      questions: vitneboks.questions,
      title: vitneboks.title,
      uid: user!.uid,
      isOpen: vitneboks.isOpen
    } as PublicVitneboks);
  },[vitneboks]);

  useEffect(() => {
    if (!user?.uid || !id) return;

    const vbRef = ref(db, `${user.uid}/vitnebokser/${id}`);
    onValue(vbRef, (snapshot) => {
      const data: Vitneboks = snapshot.val();
      if (!data) return;
      setVitneboks({
        id,
        title: data.title,
        createdOn: new Date(data.createdOn).toLocaleDateString(),
        completedVideos: data.completedVideos || 0,
        finalVideoProcessingStatus: data.finalVideoProcessingStatus,
        videosToBeProcessed: data.videosToBeProcessed,
        questions: data.questions || [],
        isOpen: data.isOpen
      });
    });
  }, [user, id, db]);

  if (!vitneboks || !user) return <LoadingFullScreen />;

  const handleAddQuestion = () => {
    if (!newQuestionText.trim() || !user.uid || !id || !vitneboks) return;

    const questionsRef = ref(db, `${user.uid}/vitnebokser/${id}/questions`);
    const newQuestion: Question = {
      text: newQuestionText,
      recordingDuration: newRecordingDuration,
      activeFrom: alwaysActive || !activeFrom ? null : dateStringToLocal(activeFrom),
      activeTo: alwaysActive || !activeTo ? null : dateStringToLocal(activeTo),
      order: Object.keys(vitneboks.questions).length,
    };
    push(questionsRef, newQuestion);

    setNewQuestionText('');
    setNewRecordingDuration(10);
    setAlwaysActive(true);
    setActiveFrom('');
    setActiveTo('');
  };

  const handleDeleteVitneboks = async() => {
    if (!user?.uid || !id) return;

    if (!confirm("Er du sikker på at du vil slette denne vitneboksen? Dette kan ikke angres.")) return;
    
    const vbRef = ref(db, `${user.uid}/vitnebokser/${id}`);
    const publicRef = ref(db, `publicVitnebokser/${id}`);
    remove(vbRef);
    remove(publicRef);
    
    await deleteVitneboks(id);
    navigate('/admin');
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDrop = (targetId: string) => {
    if (!user.uid || !id || !vitneboks || !draggedId || draggedId === targetId) return;

    const questionsArr = Object.entries(vitneboks.questions).map(([qid, q]: [string, Question & { order?: number }]) => ({ id: qid, ...q }));
    const dragged = questionsArr.find((q) => q.id === draggedId);
    const target = questionsArr.find((q) => q.id === targetId);
    if (!dragged || !target) return;

    const draggedOrder = dragged.order ?? 0;
    const targetOrder = target.order ?? 0;

    const updates: Record<string, any> = {};
    updates[`${draggedId}/order`] = targetOrder;
    updates[`${targetId}/order`] = draggedOrder;

    update(ref(db, `${user.uid}/vitnebokser/${id}/questions`), updates);
    setDraggedId(null);
  };

  const sortedQuestions = Object.entries(vitneboks.questions)
    .map(([qid, q]: [string, Question & { order?: number }]) => ({ id: qid, ...q }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="flex flex-col items-center min-h-screen bg-primary-bg text-primary-text ">
      <Header backButtonPath={"/admin/"} />
      <ToggleSwitch label='Status' checked={vitneboks.isOpen} onChange={(checked) => set(ref(db, `${user.uid}/vitnebokser/${id}/isOpen`), checked)} />
      <label htmlFor="title" className='hidden'>Tittel</label>
      <h1 className="text-3xl font-bold mb-4 bg-primary-bg">
        <input type='text' name='title' className='rounded p-2  text-center' value={vitneboks.title} onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/title`), e.currentTarget.value )} />
        </h1>
      <div className="w-full max-w-3xl space-y-4 mb-8">
        {sortedQuestions.map((q) => (
          <div
            key={q.id}
            className="bg-secondary-bg p-4 rounded border border-muted relative"
            draggable
            onDragStart={() => handleDragStart(q.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(q.id)}
          >
            <span className="absolute top-2 left-4 cursor-move text-xl" title="Dra for å endre rekkefølge">Spørsmål {q.order+1}</span>
            <span className="absolute top-2 right-4 cursor-move text-2xl" title="Dra for å endre rekkefølge">≡</span>
            <label className="block mb-1 mt-8">Spørsmålstekst</label>
            <input
              type="text"
              value={q.text}
              onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}/text`), e.target.value)}
              className="white w-full p-2 rounded text-black mb-2"
            />
            <label className="block mb-1">Opptakstid (sekunder)</label>
            <input
              type="number"
              value={q.recordingDuration}
              onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}/recordingDuration`), parseInt(e.target.value))}
              className="white w-full p-2 rounded text-black"
            />
            <div className='mt-4'>
              <ActiveFromToPicker 
              alwaysActive={q.activeFrom === undefined && q.activeTo === undefined} 
              setAlwaysActive={() => false }
              activeFrom={dateStringToLocal(q.activeFrom!)}
              activeTo={dateStringToLocal(q.activeTo!)}
              onChangeTo={(to) => set(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}/activeTo`), new Date(to).toISOString())} 
              onChangeFrom={(from) => set(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}/activeFrom`), new Date(from).toISOString())} 
              />
            </div>
            <button
            onClick={() => remove(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}`))}
            className="bg-danger text-white px-4 py-2 mt-8 rounded hover:bg-danger-200 mb-8"
            >
              Slett spørsmål
            </button>
          </div>
        ))}
      </div>

      <div className="w-full max-w-md bg-secondary-bg rounded-lg shadow-lg p-6 border border-muted mb-8">
        <h2 className="text-xl font-semibold mb-4">Legg til nytt spørsmål</h2>
        <label className="block mb-1">Spørsmålstekst</label>
        <input
          type="text"
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          placeholder="Spørsmålstekst"
          className="white w-full p-2 rounded text-black mb-4"
        />
        <label className="block mb-1">Opptakstid</label>
        <select
          value={newRecordingDuration}
          onChange={(e) => setNewRecordingDuration(parseInt(e.target.value))}
          className="white w-full p-2 rounded text-black mb-4"
        >
          <option value={10}>10 sekunder</option>
          <option value={15}>15 sekunder</option>
          <option value={25}>25 sekunder</option>
        </select>

        <ActiveFromToPicker alwaysActive={alwaysActive} setAlwaysActive={setAlwaysActive} activeFrom={activeFrom} activeTo={activeTo} onChangeFrom={setActiveFrom} onChangeTo={setActiveTo} />

        <button
          onClick={handleAddQuestion}
          className="bg-primary-button text-black px-4 py-2 rounded hover:bg-secondary w-full"
        >
          Legg til spørsmål
        </button>
      </div>
      <p className="">Opprettet: {vitneboks.createdOn.toLocaleString()}</p>
      <button
        onClick={handleDeleteVitneboks}
        className="bg-danger text-white px-4 py-2 mt-8 rounded hover:bg-danger-200 mb-8"
      >
        Slett vitneboks
      </button>
      <Footer />
    </div>
  );
}
