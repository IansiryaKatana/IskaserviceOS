import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import type { FeedbackType } from "@/components/FeedbackDialog";

interface FeedbackState {
  open: boolean;
  type: FeedbackType;
  title: string;
  message?: string;
}

interface FeedbackContextValue {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FeedbackState>({
    open: false,
    type: "success",
    title: "",
    message: undefined,
  });

  const showSuccess = useCallback((title: string, message?: string) => {
    setState({ open: true, type: "success", title, message });
  }, []);

  const showError = useCallback((title: string, message?: string) => {
    setState({ open: true, type: "error", title, message });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setState((s) => ({ ...s, open }));
  }, []);

  return (
    <FeedbackContext.Provider value={{ showSuccess, showError }}>
      {children}
      <FeedbackDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        type={state.type}
        title={state.title}
        message={state.message}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used within FeedbackProvider");
  return ctx;
}
