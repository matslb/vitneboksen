export default function NotFoundMessage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-primary-bg text-primary-text">
      <div className="flex text-3xl flex-col items-center">
        <span>Fant ikke siden du leter etter 😓</span>
      </div>
    </div>
  );
}