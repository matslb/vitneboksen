import { getAuth, signOut } from 'firebase/auth';

export default function LogoutButton() {
  const auth = getAuth();

  const handleLogout = () => {
    signOut(auth).catch(console.error);
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-danger text-white px-4 py-2 rounded"
    >
      Logg ut
    </button>
  );
}
