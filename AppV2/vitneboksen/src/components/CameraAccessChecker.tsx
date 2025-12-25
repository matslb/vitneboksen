import { useEffect, useState } from "react";

function detectInAppBrowser(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const userAgentLower = userAgent.toLowerCase();

  // Common in-app browser indicators
  const inAppBrowserPatterns = [
    "fban", // Facebook
    "fbav", // Facebook
    "instagram", // Instagram
    "twitter", // Twitter
    "linkedinapp", // LinkedIn
    "micromessenger", // WeChat
    "line", // Line
    "whatsapp", // WhatsApp
    "tiktok", // TikTok
    "snapchat", // Snapchat
    "wv", // WebView (Android)
    "webview", // WebView
  ];

  // Check if user agent matches any in-app browser pattern
  const isInAppBrowser = inAppBrowserPatterns.some((pattern) =>
    userAgentLower.includes(pattern)
  );

  // Additional check: iOS WebView detection
  const isIOSWebView =
    /iphone|ipad|ipod/.test(userAgentLower) &&
    !(window as any).MSStream &&
    !(window as any).webkit?.messageHandlers;

  // Check for missing browser features that are typically present in full browsers
  const hasLimitedFeatures =
    !(window as any).chrome && !(window as any).safari && !(window as any).firefox;

  return isInAppBrowser || (isIOSWebView && hasLimitedFeatures);
}

export default function CameraAndMicAccessChecker() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Check for in-app browser first
    const inAppBrowser = detectInAppBrowser();
    setIsInAppBrowser(inAppBrowser);

    if (inAppBrowser) {
      setChecking(false);
      return;
    }

    async function checkAccess() {
      try {
        // Attempt to get a stream with no intention to use it — just to check access.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setHasAccess(true);
      } catch (err) {
        console.error("Media access check failed", err);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    }

    checkAccess();
  }, []);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasAccess(true);
      location.reload();
    } catch {
      setHasAccess(false);
    }
  };

  if (checking) {
    return null;
  }

  // Show in-app browser warning first
  if (isInAppBrowser) {
    return (
      <div className="flex flex-col bg-danger shadow-xl rounded items-center p-4 gap-2 w-full">
        <h2 className="text-lg text-black text-center">
          Vennligst bruk en fullstendig nettleser
        </h2>
        <p className="text-sm text-black text-center">
          Vitneboksen fungerer ikke i innebygde nettlesere (som i sosiale medier-apper).
          Åpne denne siden i Safari, Chrome, Firefox eller en annen fullstendig nettleser.
        </p>
      </div>
    );
  }

  // Show camera/mic access request if no access
  if (!hasAccess) {
    return (
      <div className="flex flex-col bg-danger shadow-xl rounded items-center p-4 gap-2 w-full">
        <h2 className="text-lg text-black text-center">
          Vitneboksen trenger tilgang til kamera og mikrofon
        </h2>
        <button
          onClick={requestAccess}
          className="bg-primary-button text-black min-w-25 h-12 rounded hover:text-white hover:bg-secondary-bg"
        >
          Gi tilgang
        </button>
      </div>
    );
  }

  return null;
}
