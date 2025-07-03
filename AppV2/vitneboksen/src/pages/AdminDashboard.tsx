// src/pages/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDatabase, ref, push, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import type Vitneboks from '../types/Vitneboks';
import LogoutButton from '../components/LogoutButton';

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
        createdOn: new Date(value.createdOn),
        uploadedVideos: value.uploadedVideos || 0,
        questions: value.questions || [],
      }));
      setVitnebokser(parsed);
    });
  }, [uid]);

  const handleCreate = () => {
    if (!newTitle.trim() || !uid) return;
    const vitnebokserRef = ref(db, `${uid}/vitnebokser`);
    push(vitnebokserRef, {
      publicId: crypto.randomUUID(),
      title: newTitle,
      createdOn: new Date().toISOString(),
      uploadedVideos: 0,
      questions: [],
    });
    setNewTitle('');
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(console.error);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-primary-bg text-primary-text p-6">
      <h1 className="text-3xl font-bold mb-8">Dine vitnebokser</h1>
      <LogoutButton/>
      <ul className="flex flex-col items-center gap-4 w-full mb-16">
        {vitnebokser.map((vb) => (
          <li
            key={vb.id}
            className="border border-muted rounded-lg p-6 max-w-md w-full shadow-md bg-secondary-bg flex flex-col gap-2"
          >
            <div>
              <h2 className="text-xl font-semibold mb-2">{vb.title}</h2>
              <p className="text-m text-muted mb-1">Spørsmål: {Object.keys(vb.questions).length}</p>
              <p className="text-m text-muted">Opplastede videoer: {vb.uploadedVideos}</p>
            </div>
            <div>
              <label className="text-sm">Vitnebokslink</label>
              <input
                readOnly
                value={`${window.location.origin}/vitne/${vb.publicId}`}
                onClick={() => handleCopy(`${window.location.origin}/vitne/${vb.publicId}`, 'Vitnebokslink kopiert!')}
                className="w-full p-2 rounded bg-white text-black mb-2 cursor-pointer"
              />
              <label className="text-sm">Delelink</label>
              <input
                readOnly
                value={`${window.location.origin}/bidra/${vb.publicId}`}
                onClick={() => handleCopy(`${window.location.origin}/bidra/${vb.publicId}`, 'Delelink kopiert!')}
                className="w-full p-2 rounded bg-white text-black cursor-pointer"
              />
              {copied && <p className="text-green-500 text-sm mt-1">{copied}</p>}
            </div>
            <div className="mt-4 text-right">
              <Link
                to={`/admin/vitneboks/${vb.id}`}
                className="bg-primary-button text-black px-4 py-2 rounded hover:bg-secondary-bg"
              >
                Rediger
              </Link>
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
    </div>
  );
}