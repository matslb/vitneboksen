import { useState } from "react";

interface VitneboksLinkProps {
  vitneboksId: string;
}

export default function VitneboksLink({ vitneboksId }: VitneboksLinkProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(console.error);
  };

  const linkUrl = `${window.location.origin}/bidra/${vitneboksId}`;

  return (
    <div className="py-4">
      <label className="text-sm">Vitnebokslink</label>
      <input
        readOnly
        value={linkUrl}
        onClick={() => handleCopy(linkUrl, 'Vitnebokslink kopiert!')}
        className="w-full p-2 rounded bg-white text-black mb-2 cursor-pointer"
      />
      {copied && <p className="text-green-500 text-sm mt-1">{copied}</p>}
    </div>
  );
}

