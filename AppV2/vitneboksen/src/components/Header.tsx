import LogoutButton from './LogoutButton';

export default function Header() {
  return (
    <header className="w-full bg-secondary-bg text-primary-text py-4">
      <div className="max-w-[1024px] mx-auto px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vitneboksen</h1>
        <LogoutButton />
      </div>
    </header>
  );
}
