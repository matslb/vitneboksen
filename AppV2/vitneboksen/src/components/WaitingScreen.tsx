/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import tvTestImage from '../assets/tv-test.png';
import beep from '../assets/beep-09.mp3';
import finalBeep from '../assets/beep-08b.mp3';
interface WaitingScreenProps {
  setWaiting: (isWaiting: boolean) => void;
  withBeep: boolean;
  seconds: number;
  questionText: string;
}

export default function WaitingScreen({ seconds, withBeep, setWaiting, questionText }: WaitingScreenProps) {
  const [countdown, setCountdown] = useState(seconds);
  const beepRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev == 0) {
          clearInterval(interval);
          setWaiting(false);
          return 0;
        }
        if (withBeep && beepRef.current && prev != 1) {
          beepRef.current.currentTime = 0; // rewind
          beepRef.current.play().catch((err: any) => console.error(err));
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 fixed left-0 right-0 top-0 bottom-0 bg-black">
      {withBeep &&
        <>
          <audio src={beep} autoPlay ref={beepRef} />
          {countdown == 0 &&
            <audio src={finalBeep} autoPlay />
          }
        </>
      }
      <img src={tvTestImage} className='fixed max-w-100% md:h-full image' />
      <div className="text-[250%] top-[9%] rounded text-center bg-black/100 px-6 w-100 py-3 absolute">
        Opptak om
        <br />
        {countdown}
      </div>
       <h2 className="fixed bottom-auto top-auto 2xl:text-5xl bg-black/90 font-semibold p-6 max-w-6xl text-5xl rounded text-shadow-s">{questionText}</h2>
    </div>
  );
}
