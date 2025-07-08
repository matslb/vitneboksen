import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import type PublicVitneboks from '../types/PublicVitneboks';
import Footer from '../components/Footer';
import { generateVitneboksId, mapVitneboks } from '../utils';
import Header from '../components/Header';
import VitneboksBox from '../components/VitneboksBox';

export default function AdminDashboard() {
  const [vitnebokser, setVitnebokser] = useState<Vitneboks[]>([]);
  const [newTitle, setNewTitle] = useState('');

  const auth = getAuth();
  const db = getDatabase();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const vitnebokserRef = ref(db, `${uid}/vitnebokser`);
    onValue(vitnebokserRef, (snapshot) => {
      const data = snapshot.val() || {};
      setVitnebokser(Object.values(data).map(v => mapVitneboks(v)))
    });
  }, [uid]);

  const handleCreate = () => {
    if (!newTitle.trim() || !uid) return;
    const newVitneboks: Vitneboks = {
      id: generateVitneboksId(),
      title: newTitle,
      createdOn: new Date(Date.now()).toISOString(),
      videosToBeProcessed: 0,
      completedVideos: 0,
      finalVideoProcessingStatus: FinalVideoStatus.notStarted,
      questions: [],
      isOpen: true
    };
    const vitneboksRef = ref(db, `${uid}/vitnebokser/${newVitneboks.id}`);
    set(vitneboksRef, newVitneboks);

    const publicVitneboksRef = ref(db, `publicVitnebokser/${newVitneboks.id}`);

    set(publicVitneboksRef, {
      questions: newVitneboks.questions,
      title: newVitneboks.title,
      uid: uid
    } as PublicVitneboks);

    setNewTitle('');
  };


  return (
    <div className="flex flex-col items-center min-h-screen bg-primary-bg text-primary-text">
      <Header />
      <h2 className="text-3xl font-bold mb-8">Dine vitnebokser</h2>
      <ul className="flex flex-col items-center gap-4 w-full mb-16">
        {vitnebokser.map((vb) => (
          <li
            key={vb.id}
            className="border border-muted rounded-lg p-6 max-w-md w-full shadow-md bg-secondary-bg flex flex-col gap-2"
          >
            <VitneboksBox Vitneboks={vb} />
          </li>
        ))}
      </ul>
      <div className="max-w-md w-full bg-secondary-bg rounded-lg shadow-lg p-6 mb-16 border border-muted">
        <h2 className="text-xl font-semibold mb-4">Opprett ny vitneboks</h2>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={50}
          placeholder="Navn på arrangement"
          className="w-full p-2 rounded  bg-white text-black mb-4 border border-gray-300"
        />
        {vitnebokser.length <= 1 ?
          <button
            onClick={handleCreate}
            className="bg-primary-button hover:text-white  text-black px-4 py-2 rounded hover:bg-secondary-bg w-full"
          >
            Opprett
          </button>
          :
          <button
            onClick={handleCreate}
            disabled={true}
            className="bg-primary-button hover:text-white  disabled opacity-40 cursor-not-allowed text-black px-4 py-2 rounded w-full"
          >
            Du kan bare ha to aktive vitnebokser
          </button>
        }
      </div>
      <Footer />
    </div>
  );
}