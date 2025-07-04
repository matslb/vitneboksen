// src/pages/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { FinalVideoStatus, type Vitneboks} from '../types/Vitneboks';
import type PublicVitneboks from '../types/PublicVitneboks';
import Footer from '../components/Footer';
import { generateVitneboksId } from '../utils';
import SpinnerIcon from '../components/SpinnerIcon';
import { downloadFinalVideo, startFinalVideoProcessing } from '../videoProcessorService';
import Header from '../components/Header';

export default function AdminDashboard() {
  const [vitnebokser, setVitnebokser] = useState<Vitneboks[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const auth = getAuth();
  const db = getDatabase();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const vitnebokserRef = ref(db, `${uid}/vitnebokser`);
    onValue(vitnebokserRef, (snapshot) => {
      const data = snapshot.val() || {};
      const parsed: Vitneboks[] = Object.entries(data).map(([id, value]: any) => ({
        id,
        publicId: value.publicId || id,
        title: value.title,
        createdOn: new Date(value.createdOn).toLocaleDateString(),
        completedVideos: value.completedVideos || 0,
        videosToBeProcessed: value.videosToBeProcessed,
        finalVideoProcessingStatus: value.finalVideoProcessingStatus,
        questions: value.questions || [],
      } as Vitneboks));
      setVitnebokser(parsed);
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(console.error);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-primary-bg text-primary-text">
      <Header/>      
      <h2 className="text-3xl font-bold mb-8">Dine vitnebokser</h2>
      <ul className="flex flex-col items-center gap-4 w-full mb-16">
        {vitnebokser.map((vb) => (
          <li
            key={vb.id}
            className="border border-muted rounded-lg p-6 max-w-md w-full shadow-md bg-secondary-bg flex flex-col gap-2"
          >
            <div>
              <h2 className="text-xl font-semibold mb-2">{vb.title}</h2>
              <div className='flex flex-col gap-2'>

              <p className="text-m text-muted mb-1"><span className='bg-white text-center text-black min-w-9 inline-block pl-2 pr-2 pt-1 pb-1 rounded'>{Object.keys(vb.questions).length}</span> spørsmål</p>
              {vb.videosToBeProcessed > 0 &&
              <p className="text-m text-muted"><span className='bg-white text-black text-center min-w-9 inline-block pl-2 pr-2 pt-1 pb-1 rounded'><SpinnerIcon />{vb.videosToBeProcessed}</span> vitnesbyrd behandlingskø </p>
              }
              <p className="text-m text-muted"><span className='bg-white text-black text-center min-w-9 inline-block pl-2 pr-2 pt-1 pb-1 rounded'>{vb.completedVideos}</span> {vb.completedVideos > 1 ? "behandlede vitnesbyrd" : "behandlet vitnesbyrd"}</p>
            </div>
            </div>
            {Object.values(vb.questions).length > 0 ?
              <div>
                <label className="text-sm">Vitnebokslink</label>
                <input
                  readOnly
                  value={`${window.location.origin}/vitne/${vb.id}`}
                  onClick={() => handleCopy(`${window.location.origin}/vitne/${vb.id}`, 'Vitnebokslink kopiert!')}
                  className="w-full p-2 rounded bg-white text-black mb-2 cursor-pointer"
                  />
                  { /*
                <label className="text-sm">Delelink</label>
                <input
                  readOnly
                  value={`${window.location.origin}/bidra/${vb.id}`}
                  onClick={() => handleCopy(`${window.location.origin}/bidra/${vb.id}`, 'Delelink kopiert!')}
                  className="w-full p-2 rounded bg-white text-black cursor-pointer"
                  /> */}
                {copied && <p className="text-green-500 text-sm mt-1">{copied}</p>}
              </div>
                : 
                <div>
                  <p>Legg til spørsmål for å komme i gang.</p>
                </div>
              }
              
              <div className="mt-4 text-right flex flex-row-reverse justify-between gap-6">
                  <Link
                  to={`/admin/vitneboks/${vb.id}`}
                  className="bg-primary-button text-black px-4 py-2 rounded"
                  >
                  Rediger
                </Link>

                {vb.completedVideos > 1 && vb.finalVideoProcessingStatus == FinalVideoStatus.notStarted && 
                <button 
                onClick={() => startFinalVideoProcessing(vb.id)}
                className=" flex gap-2 bg-primary-button  text-black px-4 py-2 rounded ">
                 Generer Vitneboksvideo
                </button>
                }
                {vb.completedVideos > 0 && vb.finalVideoProcessingStatus == FinalVideoStatus.started && 
                <button 
                className="flex bg-primary-button-disabled disabled text-black px-4 py-2 rounded ">
                  <SpinnerIcon />
                  Vitneboksvideo mekkes nå
                </button>
                }
                { vb.completedVideos > 0 && vb.finalVideoProcessingStatus == FinalVideoStatus.completed && 
                <button 
                onClick={() => downloadFinalVideo(vb.id)}
                className="bg-primary-button text-black px-4 py-2 rounded">
                  Last ned Vitneboksvideo
                </button>
                }
              
            </div>
          </li>
        ))}
      </ul>
      <div className="max-w-md w-full bg-secondary-bg rounded-lg shadow-lg p-6 border border-muted">
        <h2 className="text-xl font-semibold mb-4">Opprett ny vitneboks</h2>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Navn på arrangement"
          className="w-full p-2 rounded bg-white text-black mb-4 border border-gray-300"
        />
        <button
          onClick={handleCreate}
          className="bg-primary-button text-black px-4 py-2 rounded hover:bg-secondary-bg w-full"
        >
          Opprett
        </button>
      </div>
      <Footer />
    </div>
  );
}