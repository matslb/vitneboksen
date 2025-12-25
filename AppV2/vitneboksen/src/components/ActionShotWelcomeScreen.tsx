import { useState, useEffect } from 'react';
import { detectInAppBrowser, CameraAccessChecker} from './CameraAccessChecker';

interface ActionShotWelcomeScreenProps {
  title: string;
  onStart: (userName: string) => void;
  initialName?: string;
}

export default function ActionShotWelcomeScreen({ title, onStart, initialName = '' }: ActionShotWelcomeScreenProps) {
  const [userName, setUserName] = useState(initialName);

  // Update userName when initialName changes (e.g., when saved name is loaded)
  useEffect(() => {
    if (initialName) {
      setUserName(initialName);
    }
  }, [initialName]);

  const handleStart = () => {
    if (userName.trim()) {
      onStart(userName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center flex-1 p-2">
      <div className="mb-3 mt-3 lg:my-16">
        <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-center">{title}</h1>
      </div>
      <div className="my-8 lg:my-12 flex flex-col items-center w-100px max-w-2xl">
        <div className="mb-6 w-full flex flex-col items-center">
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userName.trim()) {
                handleStart();
              }
            }}
            placeholder="Ditt navn"
            className="text-xl px-4 py-2 bg-white text-black w-full rounded border-2 border-primary-button focus:outline-none focus:border-secondary-bg text-center"
          />
        </div>
    
        {!detectInAppBrowser  ? (
          <CameraAccessChecker />
        ) : (
          <button
            onClick={handleStart}
            disabled={!userName.trim()}
            className="bg-primary-button text-black text-xl px-6 py-2 w-full rounded hover:text-white hover:bg-secondary-bg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Spill inn videosnutt
          </button>
        )}
        <p className="text-l text-center m-4">
          Du får 10 sekunder på deg.
        </p>
      </div>
    </div>
  );
}

