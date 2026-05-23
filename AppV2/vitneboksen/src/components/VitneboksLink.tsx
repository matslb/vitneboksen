import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";

interface VitneboksLinkProps {
  vitneboksId: string;
  showQRCode?: boolean;
}

export default function VitneboksLink({
  vitneboksId,
  showQRCode = true,
}: VitneboksLinkProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(console.error);
  };

  const handleDownload = async () => {
    if (qrRef.current === null) return;

    try {
      const dataUrl = await toPng(qrRef.current, { backgroundColor: '#ffffff', cacheBust: true });
      const link = document.createElement('a');
      link.download = `vitneboks-${vitneboksId}-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Kunne ikke laste ned QR-kode', err);
    }
  };

  const linkUrl = `${window.location.origin}/bidra/${vitneboksId}`;

  return (
    <div className="bg-white/10 rounded flex items-start md:items-end md:flex-row flex-col gap-4 p-4 my-4">
      <div>
        <label className="text-xl block mb-2">Vitnebokslink</label>
            <input
          readOnly
          value={linkUrl}
          onClick={() => handleCopy(linkUrl, "Vitnebokslink kopiert!")}
          className="w-full min-w-80 p-2 rounded bg-white text-black mb-4 cursor-pointer"
        />
        {copied && <p className="text-green-500 text-sm absolute -mt-3">{copied}</p>}
      </div>
      {showQRCode &&
      <div className="flex flex-col items-center justify-end gap-4">
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={qrRef} className="p-8 bg-white">
            <QRCodeSVG
              value={linkUrl}
              size={1024}
              level="L"
            />
          </div>
        </div>
        <button
          onClick={handleDownload}
          className=":hover:bg-secondary-bg bg-primary-button mb-4 text-black py-2 px-4 rounded transition-colors"
        >
          Last ned QR-kode
        </button>
      </div>
      }
    </div>
  );
}

