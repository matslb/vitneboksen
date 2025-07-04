export default function SpinnerIcon() {
  return (
    <div className="inline-block pr-2">
        <svg
        className="animate-spin h-5 w-5 text-blac"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z"
            />
        </svg>
    </div>
  );
}
