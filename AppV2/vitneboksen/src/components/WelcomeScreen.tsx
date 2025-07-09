import CameraAndMicAccessChecker from "./CameraAccessChecker";

interface WelcomeScreenProps {
  title: string,
  recordingTime: number,
  onStart: () => void;
}

export default function WelcomeScreen({ title, recordingTime, onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-2">
      <div className="mb-3 lg:mb-12">
        <h1 className="text-3xl lg:text-5xl font-bold mb-4 text-center">VITNEBOKSEN</h1>
        <h1 className="text-2xl mb-4 text-center">ønsker deg velkommen til...</h1>
      </div>
      <div className="mb-3 mt-3 lg:my-16">
        <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-center">{title}</h1>
      </div>
      <div className="my-8 lg:my-12 flex flex-col">
        <p className="text-2xl  text-center">
          Svar på spørsmålet som dukker opp.
          Du får {recordingTime} sekunder på deg.
        </p>

        <p className="text-2xl my-2 lg:my-4 text-center">
          Slapp av, det ække no farlig.
        </p>
      </div>
      {!CameraAndMicAccessChecker() ?
        <button
          onClick={onStart}
          className="bg-primary-button text-black text-xl px-6 py-3 rounded hover:text-white hover:bg-secondary-bg"
        >
          Kjør opptak
        </button>
        :
        <CameraAndMicAccessChecker />
      }
    </div>
  );
}
