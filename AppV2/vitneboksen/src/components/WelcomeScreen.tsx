interface WelcomeScreenProps {
    title: string,
    onStart: () => void;
}

export default function WelcomeScreen({ title, onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="m-16">
            <h1 className="text-2xl font-bold mb-4 text-center">Velkommen til Vitneboksen i anledning</h1>
            <h2 className="text-6xl font-bold mb-4 text-center">{title}</h2>
        </div>
      <p className="text-lg mb-8 text-center">
        Når du trykker på knappen under vil du få et spørsmål og opptaket starter etter en kort nedtelling.
      </p>
      <button
        onClick={onStart}
        className="bg-primary-button text-black text-xl px-6 py-3 rounded hover:bg-secondary-bg"
      >
        Jeg er klar
      </button>
    </div>
  );
}
