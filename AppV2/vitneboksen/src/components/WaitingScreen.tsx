import { useEffect, useState } from 'react';

interface WaitingScreenProps {
  seconds: number;
}

export default function WaitingScreen({ seconds }: WaitingScreenProps) {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <h2 className="text-3xl font-bold mb-4">Takk for ditt bidrag</h2>
      <p className="text-lg">Vitneboksen åpner igjen om {countdown} sekunder…</p>
    </div>
  );
}
