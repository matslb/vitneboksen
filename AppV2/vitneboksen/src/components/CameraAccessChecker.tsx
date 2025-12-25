import { useEffect, useState } from "react";

/**
 * Detects if the user is using an in-app browser (e.g., Facebook, Instagram, etc.)
 * @returns Error message string if an in-app browser is detected, null otherwise
 */
export function detectInAppBrowser(): string | null {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const userAgentLower = userAgent.toLowerCase();

  // Map of browser patterns to their display names
  const browserPatterns: Array<{ pattern: string; name: string }> = [
    { pattern: "fban", name: "Facebook" },
    { pattern: "fbav", name: "Facebook" },
    { pattern: "instagram", name: "Instagram" },
    { pattern: "twitter", name: "Twitter" },
    { pattern: "linkedinapp", name: "LinkedIn" },
    { pattern: "micromessenger", name: "WeChat" },
    { pattern: "line", name: "Line" },
    { pattern: "whatsapp", name: "WhatsApp" },
    { pattern: "tiktok", name: "TikTok" },
    { pattern: "snapchat", name: "Snapchat" },
    { pattern: "wv", name: "WebView" },
    { pattern: "webview", name: "WebView" },
  ];

  // Check if user agent matches any in-app browser pattern
  for (const { pattern, name } of browserPatterns) {
    if (userAgentLower.includes(pattern)) {
      return `Jasså, åpner du linker inne i ${name}. Bruk heller en skikkelig browser`;
    }
  }

  // Additional check: iOS WebView detection
  const isIOSWebView =
    /iphone|ipad|ipod/.test(userAgentLower) &&
    !(window as any).MSStream &&
    !(window as any).webkit?.messageHandlers;

  // Check for missing browser features that are typically present in full browsers
  const hasLimitedFeatures =
    !(window as any).chrome && !(window as any).safari && !(window as any).firefox;

  if (isIOSWebView && hasLimitedFeatures) {
    return "Nå har du åpna denne linken inne i en app uten noen funksjoner :(. Bruk heller en skikkelig browser";
  }

  return null;
}

/**
 * Checks if the user has access to camera and microphone
 * @returns Promise that resolves to true if access is granted, false otherwise
 */
export async function checkCameraAccess(): Promise<boolean> {
  try {
    // Attempt to get a stream with no intention to use it — just to check access.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.error("Media access check failed", err);
    return false;
  }
}

/**
 * Requests camera and microphone access from the user
 * @returns Promise that resolves to true if access is granted, false otherwise
 */
export async function requestCameraAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Component that displays messages based on camera/mic access status and browser type.
 * The actual checking should be done externally using the exported functions.
 */
export function CameraAccessChecker() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function performCheck() {
      // Check camera access
      const access = await checkCameraAccess();
      setHasAccess(access);
      setChecking(false);
    }

    performCheck();
  }, []);

  if (checking) {
    return null;
  }

  // Show camera/mic access request if no access
  if (hasAccess === false) {
    return (
      <div className="flex flex-col bg-danger shadow-xl rounded items-center p-4 gap-2 w-full">
        <h2 className="text-lg text-black text-center">
          Vitneboksen trenger tilgang til kamera og mikrofon
        </h2>
      </div>
    );
  }

  return null;
}