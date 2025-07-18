// src/pages/Login.tsx
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import Footer from '../components/Footer';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-primary-bg text-primary-text">
      <main className="flex-col flex mt-auto mb-auto items-center justify-center">
        <header className="p-8 text-center">
          <h1 className="text-4xl font-bold">Velkommen til VITNEBOKSEN</h1>
        </header>
        <button
          type="button"
          onClick={handleLogin}
          className="bg-primary-button text-black text-2xl px-8 py-4 rounded shadow-md hover:text-white hover:bg-secondary-bg"
        >
          Logg inn med Google
        </button>
      </main>
      <Footer />
    </div>
  );
}
