import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export type FeedbackType = "success" | "error";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FeedbackType;
  title: string;
  message?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  type,
  title,
  message,
}: FeedbackDialogProps) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isSuccess ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className={isSuccess ? "text-green-700 dark:text-green-400" : "text-destructive"}>
                {title}
              </DialogTitle>
              {message && <DialogDescription className="mt-1">{message}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
