import { useEffect, useState } from 'react';
import tvTestImage from '../assets/tv-test.png';
import beep from '../assets/beep-09.mp3';
interface WaitingScreenProps {
  setWaiting: (isWaiting: boolean) => void;
  withBeep: boolean
  seconds: number;
}

export default function WaitingScreen({ seconds, withBeep, setWaiting }: WaitingScreenProps) {
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
    <div className="flex flex-col items-center justify-center flex-1 p-6 fixed left-0 right-0 top-0 bottom-0 bg-black">
      {withBeep && countdown == 1 &&
        <audio src={beep} autoPlay />
      }
      <img src={tvTestImage} className='fixed max-w-100% md:h-full image' />
      <div className="text-[275%] top-[10.5%] text-center w-100 h-100 top-0 absolute"> {countdown}</div>
    </div>
  );
}
