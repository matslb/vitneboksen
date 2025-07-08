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
    <>
      <div className='bg-primary-bg min-h-screen'>
        <Header />
        <div className="max-w-[1024px] m-auto px-4 bg-primary-bg text-primary-text">
          {vitnebokser.length !== 0 &&
            <>
              <ul className="flex flex items-center flex-wrap gap-4 w-full mb-16">
                {vitnebokser.map((vb) => (
                  <li
                    key={vb.id}
                    className="rounded max-w-md w-full shadow-md bg-secondary-bg flex flex-col gap-2"
                  >
                    <VitneboksBox Vitneboks={vb} />
                  </li>
                ))}
              </ul>
            </>
          }
          <div className="max-w-md w-full bg-secondary-bg rounded shadow-md p-6 mb-16">
            <h2 className="text-xl font-semibold mb-4">Opprett ny vitneboks</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={45}
              placeholder="Navn på arrangement"
              className="w-full p-2 rounded bg-white text-black mb-4"
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
          <div className='p-8 rounded my-16 text-xl bg-secondary-bg'>
            <h3 className='text-2xl'>Hvordan bruke VITNEBOKSEN?</h3>
            <br />
            <p>Dette trenger du for å komme i gang med Vitneboksen:</p>
            <ol className='list px-16 py-4'>
              <li className='list-disc'>Et arrangement eller en hendelse du ønsker å dokumentere.</li>
              <li className='list-disc'>En PC eller Mac.</li>
              <li className='list-disc'>Et webkamera og en mikrofon.</li>
            </ol>
            <p>Sånn gjør du det:</p>
            <ol className='list px-16 py-4'>
              <li className='list-decimal'>Opprett en Vitneboks, og legg til spørsmålene du vil at deltakerne skal svare på.</li>
              <li className='list-decimal'>Kopier <span className='italic'>Vitnebokslinken</span> og åpne den i en nettleser (Chrome, Edge, eller Firefox) på PCen du skal bruke på arrangementet ditt.</li>
              <li className='list-decimal'>Send inn dine første ofre.</li>
            </ol>

            <p className='text-sm'>... og du, det kan ta litt tid før en video er ferdigbehandlet. Frykt ikke, den går nok igjennom til slutt.</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}