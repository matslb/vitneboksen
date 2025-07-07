import { useEffect, useState } from 'react';

interface ThankYouScreenProps {
    setWaiting: (isWaiting: boolean) => void;
    seconds: number;
}

export default function ThankYouScreen({ seconds, setWaiting }: ThankYouScreenProps) {
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
      <h2 className="text-3xl font-bold mb-4">Takk til deg!</h2>
      <p className="text-lg">Vitneboksen åpner igjen om {countdown} sekunder…</p>
      <p className="text-2xl mt-16 ">Nå kan du vinke inn neste, og bare kul'n</p>
    </div>
  );
}
