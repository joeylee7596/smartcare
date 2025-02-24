import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertTriangle, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface MissingDocumentation {
  date: string;
  type: 'tour' | 'shift';
  id: number;
}

interface DocumentationCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  onCreateDocumentation: (item: MissingDocumentation) => void;
  missingDocs: MissingDocumentation[];
  patientName: string;
}

export function DocumentationCheckDialog({
  open,
  onOpenChange,
  onProceed,
  onCreateDocumentation,
  missingDocs,
  patientName
}: DocumentationCheckDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Fehlende Dokumentationen</DialogTitle>
          </div>
          <DialogDescription>
            Für {patientName} wurden {missingDocs.length} fehlende Dokumentationen gefunden
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] mt-4">
          <div className="space-y-4">
            {missingDocs.map((doc) => (
              <div
                key={`${doc.type}-${doc.id}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">
                      {doc.type === 'tour' ? 'Tour' : 'Schicht'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(doc.date), "dd. MMMM yyyy", { locale: de })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateDocumentation(doc)}
                  className="ml-4"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Dokumentieren
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={onProceed}>
            Trotzdem fortfahren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}