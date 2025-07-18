// shared/useOfflineSync.ts
import { useEffect } from "react";
import { db } from "../firebase";
import { enableIndexedDbPersistence } from "firebase/firestore";

export function useEnableOfflineSync(onError?: (err: any) => void) {
  useEffect(() => {
    enableIndexedDbPersistence(db).catch((err) => {
      if (onError) onError(err);
      // Optional: dispatch custom event for app-level error banner
      // window.dispatchEvent(new CustomEvent("hydrosafe:offline-fail", { detail: err?.message }));
      if (err.code === 'failed-precondition') {
        console.warn("Offline sync not enabled (multiple tabs open)");
      } else if (err.code === 'unimplemented') {
        console.warn("Offline sync unsupported in this browser");
      }
    });

    function handleOnline() {
      window.location.reload();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onError]);
}