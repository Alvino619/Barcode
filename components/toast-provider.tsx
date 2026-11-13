"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <ToastContext.Provider value={notify}>{children}
    <div className="fixed bottom-5 right-5 z-50 max-w-sm" aria-live="polite" aria-atomic="true">
      {toast && <div role={toast.error ? "alert" : "status"} className={`flex items-start gap-4 rounded-xl border p-4 shadow-lg ${toast.error ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-white text-emerald-950"}`}>
        <p className="text-sm">{toast.message}</p><button type="button" aria-label="Tutup notifikasi" onClick={() => setToast(null)}><X className="h-4 w-4" /></button>
      </div>}
    </div>
  </ToastContext.Provider>;
}
