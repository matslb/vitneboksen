import { Link } from 'react-router-dom';
import LogoutButton from './LogoutButton';

interface HeaderProps {
  backButtonPath?: string
}

export default function Header({ backButtonPath }: HeaderProps) {
  return (
    <div className="w-full pb-2">
      <header className=" w-full bg-secondary-bg text-primary-text py-4 mb-2">
        <div className="max-w-[1024px] mx-auto px-4 flex justify-between align-center items-center">
          <h1 className="text-2xl font-bold">VITNEBOKSEN</h1>
          <LogoutButton />
        </div>
      </header>
      <div className="max-w-[1024px] p-2 mx-auto ">
        {backButtonPath !== undefined &&
          <Link
            to={backButtonPath}
            className="bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
          >
            Tilbake
          </Link>
        }
      </div>
    </div>
  );
}
