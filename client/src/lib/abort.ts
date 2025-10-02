// client/src/lib/abort.ts
// Single source of truth for detecting & swallowing benign AbortErrors.

export function isAbort(reason: unknown): boolean {
  if (!reason) return false;

  // DOMException AbortError
  if (typeof DOMException !== "undefined" && reason instanceof DOMException) {
    if (reason.name === "AbortError") return true;
    // Some browsers stringify abort like this:
    if ((reason as any)?.message?.toLowerCase?.().includes("abort")) return true;
  }

  // Standard Error
  if (reason instanceof Error) {
    const msg = (reason.message || "").toLowerCase();
    if (reason.name === "AbortError") return true;
    if (msg.includes("abort") || msg.includes("canceled") || msg.includes("cancelled")) return true;
    if (msg.includes("signal is aborted without reason")) return true;
    if (msg.includes("failed to fetch")) return true; // often thrown when aborted mid-flight
  }

  // String / unknown
  const s = String((reason as any)?.message ?? reason ?? "").toLowerCase();
  return (
    s.includes("abort") ||
    s.includes("canceled") ||
    s.includes("cancelled") ||
    s.includes("signal is aborted without reason") ||
    s.includes("failed to fetch")
  );
}

/**
 * Wrap a promise and return null if it rejects due to an AbortError.
 * Keeps your async pipelines clean without try/catch noise.
 */
export async function abortSafe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    if (isAbort(err)) return null;
    throw err;
  }
}

/**
 * One-time global guards to prevent benign aborts from triggering runtime overlays.
 */
export function installGlobalAbortGuards(): void {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { __abortGuardsInstalled?: boolean };
  if (w.__abortGuardsInstalled) return;

  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isAbort(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const handleError = (event: ErrorEvent) => {
    const reason = (event as ErrorEvent & { error?: unknown }).error ?? event.message;
    if (isAbort(reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener("unhandledrejection", handleRejection, { capture: true });
  window.addEventListener("error", handleError, { capture: true });
  w.__abortGuardsInstalled = true;
}
