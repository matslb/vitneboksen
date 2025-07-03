// The issue is most likely that `auth.currentUser?.uid` is null when the page reloads,
// because Firebase Auth state can take a moment to initialize.
// Fix: use onAuthStateChanged to wait for the user to be loaded.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, onValue, push, set, update } from 'firebase/database';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import type Vitneboks from '../types/Vitneboks';
import type Question from '../types/Question';
import ActiveFromToPicker from '../components/ActiveFromToDatePicker';
import LoadingFullScreen from '../components/LoadingFullScreen';
import LogoutButton from '../components/LogoutButton';

export default function VitneboksDetail() {
  const { id } = useParams();
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
    if (!user?.uid || !id) return;

    const vbRef = ref(db, `${user.uid}/vitnebokser/${id}`);
    onValue(vbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      setVitneboks({
        id,
        publicId: data.publicId || id,
        title: data.title,
        createdOn: new Date(data.createdOn),
        uploadedVideos: data.uploadedVideos || 0,
        questions: data.questions || [],
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
      activeFrom: alwaysActive || !activeFrom ? null : new Date(activeFrom),
      activeTo: alwaysActive || !activeTo ? null : new Date(activeTo),
      order: Object.keys(vitneboks.questions).length,
    };
    push(questionsRef, newQuestion);

    setNewQuestionText('');
    setNewRecordingDuration(10);
    setAlwaysActive(true);
    setActiveFrom('');
    setActiveTo('');
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
    <div className="flex flex-col items-center min-h-screen bg-primary-bg text-primary-text p-6">
      <h1 className="text-3xl font-bold mb-4">{vitneboks.title}</h1>
      <LogoutButton/>
      <p className="mb-8">Opprettet: {vitneboks.createdOn.toLocaleString()}</p>
      <h2 className="text-2xl  font-bold mb-4">Spørsmål</h2>
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
            <span className="absolute top-2 left-4 cursor-move text-xl" title="Dra for å endre rekkefølge">{q.order}</span>
            <span className="absolute top-2 right-4 cursor-move text-2xl" title="Dra for å endre rekkefølge">≡</span>
            <label className="block mb-1 mt-8">Spørsmålstekst</label>
            <input
              type="text"
              value={q.text}
              onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}/text`), e.target.value)}
              className="w-full p-2 rounded text-black mb-2"
            />
            <label className="block mb-1">Opptakstid (sekunder)</label>
            <input
              type="number"
              value={q.recordingDuration}
              onChange={(e) => set(ref(db, `${user.uid}/vitnebokser/${id}/questions/${q.id}/recordingDuration`), parseInt(e.target.value))}
              className="w-full p-2 rounded text-black"
            />
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
          className="w-full p-2 rounded text-black mb-4"
        />
        <label className="block mb-1">Opptakstid</label>
        <select
          value={newRecordingDuration}
          onChange={(e) => setNewRecordingDuration(parseInt(e.target.value))}
          className="w-full p-2 rounded text-black mb-4"
        >
          <option value={10}>10 sekunder</option>
          <option value={15}>15 sekunder</option>
          <option value={25}>25 sekunder</option>
        </select>

        <div className="mb-4">
          <label className="mr-4">
            <input
              type="radio"
              checked={alwaysActive}
              onChange={() => setAlwaysActive(true)}
              className="mr-1"
            />
            Alltid aktiv
          </label>
          <label>
            <input
              type="radio"
              checked={!alwaysActive}
              onChange={() => setAlwaysActive(false)}
              className="mr-1"
            />
            Aktiv fra - til
          </label>
        </div>

        {!alwaysActive && (
        <ActiveFromToPicker activeFrom={activeFrom} activeTo={activeTo} onChangeFrom={setActiveFrom} onChangeTo={setActiveTo} />
        )}

        <button
          onClick={handleAddQuestion}
          className="bg-primary-button text-black px-4 py-2 rounded hover:bg-secondary-bg w-full"
        >
          Legg til spørsmål
        </button>
      </div>

      <button className="bg-primary-button text-black px-6 py-3 rounded hover:bg-secondary-bg">
        Last ned vitneboksvideo
      </button>
    </div>
  );
}
