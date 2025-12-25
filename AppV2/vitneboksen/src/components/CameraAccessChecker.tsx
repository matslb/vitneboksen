import { useEffect, useState } from "react";

/**
 * Detects if the user is using an in-app browser (e.g., Facebook, Instagram, etc.)
 * @returns true if an in-app browser is detected, false otherwise
 */
export function detectInAppBrowser(): boolean {
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