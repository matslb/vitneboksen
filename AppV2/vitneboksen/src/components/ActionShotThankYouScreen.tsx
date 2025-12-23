import { useEffect, useState } from 'react';

interface ActionShotThankYouScreenProps {
  setWaiting: (isWaiting: boolean) => void;
  seconds: number;
}

export default function ActionShotThankYouScreen({ seconds, setWaiting }: ActionShotThankYouScreenProps) {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev == 1) {
          clearInterval(interval);
          setWaiting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <h2 className="text-4xl font-bold mb-16">Takk til deg!</h2>
      <p className="text-2xl my-4">Vitneboksen åpner igjen om {countdown} sekunder…</p>
    </div>
  );
}

