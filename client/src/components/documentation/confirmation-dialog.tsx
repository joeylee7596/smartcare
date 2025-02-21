import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Check, Edit2 } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentation: string;
  onConfirm: (text: string, sendToReview: boolean) => void;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  documentation,
  onConfirm,
}: ConfirmationDialogProps) {
  const [editedText, setEditedText] = useState(documentation);
  const [isEditing, setIsEditing] = useState(false);

  const handleConfirm = (sendToReview: boolean) => {
    onConfirm(editedText, sendToReview);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>KI-generierte Dokumentation überprüfen</DialogTitle>
          <DialogDescription>
            Bitte überprüfen Sie die generierte Dokumentation. Sie können den Text bearbeiten, falls Änderungen erforderlich sind.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {isEditing ? (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border min-h-[200px] whitespace-pre-wrap">
              {editedText}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="w-full"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {isEditing ? "Vorschau anzeigen" : "Text bearbeiten"}
          </Button>
        </div>
        <DialogFooter className="mt-6">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => handleConfirm(false)}
              className="flex-1"
            >
              Dokumentation abschließen
            </Button>
            <Button 
              onClick={() => handleConfirm(true)}
              className="flex-1 bg-primary"
            >
              <Check className="w-4 h-4 mr-2" />
              Zur Überprüfung senden
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
