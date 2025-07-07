interface WelcomeScreenProps {
    title: string,
    recordingTime: number,
    onStart: () => void;
}

export default function WelcomeScreen({ title, recordingTime , onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center flex-1 mt-12 p-6">
        <div className="m-16">
            <h1 className="text-5xl font-bold mb-4 text-center">VITNEBOKSEN</h1>
            <h1 className="text-xl mb-4 text-center">ønsker deg velkommen til...</h1>
          </div>
        <div className="m-16">
            <h1 className="text-6xl font-bold mb-4 text-center">{title}</h1>
        </div>
        <div className="m-16 flex flex-col" >
          <p className="text-xl mb-8 text-center">
             Svar på spørsmålet som dukker opp. 
            Du får {recordingTime} sekunder på deg.
          </p>

          <p className="text-xl mb-8 text-center">
            Slapp av, det ække no farlig altså.
          </p>            
          <button
            onClick={onStart}
            className="bg-primary-button text-black text-xl px-6 py-3 rounded hover:text-white hover:bg-secondary-bg"
            >
            Kjør opptak 
          </button>
        </div>
    </div>
  );
}
