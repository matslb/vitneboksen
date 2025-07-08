import sponsorLogo from '../assets/spritjakt.png';

export default function Footer() {
  return (
    <footer className=" bottom-0 w-full flex flex-wrap flex-col md:flex-row justify-evenly items-center gap-4 mt-auto bg-secondary-bg text-primary-text py-6">
      <div>
        &copy; {new Date().getFullYear()}{' '}
        <a
          href="https://no.linkedin.com/in/mats-l%C3%B8vstrand-berntsen-4682b2142"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary-button"
        >
          Mats Løvstrand Berntsen
        </a>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span>Sponset av</span>
        <a
          href="https://spritjakt.no"
          className="underline hover:text-primary-button inline-flex items-center gap-1"
        >
          <img
            src={sponsorLogo}
            alt="spritjakt logo"
            className="h-6"
          />
        </a>
        <span>og</span>
        <a
          href="https://erdetfesthosmats.no"
          className="underline hover:text-primary-button"
        >
          erdetfesthosmats.no
        </a>
      </div>
      <div>
        Kildekoden finner du på{' '}
        <a
          href="https://github.com/matslb/vitneboksen"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary-button"
        >
          Github
        </a>
      </div>
    </footer>
  );
}
