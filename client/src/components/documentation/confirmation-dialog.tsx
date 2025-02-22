import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Check, Edit2, Brain, MessageSquare, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setEditedText(documentation);
    // In a real implementation, we would fetch AI suggestions here
    setAiSuggestions([
      "Erwähnen Sie die Vitalzeichen des Patienten",
      "Dokumentieren Sie die Medikamentengabe",
      "Fügen Sie Informationen zur Mobilität hinzu",
    ]);
  }, [documentation]);

  const handleConfirm = (sendToReview: boolean) => {
    onConfirm(editedText, sendToReview);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-blue-100">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle>Dokumentation überprüfen</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="preview" className="h-full">
            <TabsList>
              <TabsTrigger 
                value="preview" 
                onClick={() => setActiveTab("preview")}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Vorschau
              </TabsTrigger>
              <TabsTrigger 
                value="edit" 
                onClick={() => setActiveTab("edit")}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Bearbeiten
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 grid grid-cols-[2fr,1fr] gap-4">
              <div className="space-y-4">
                <TabsContent value="preview" className="m-0">
                  <div className="p-4 rounded-lg bg-muted/50 border min-h-[400px] whitespace-pre-wrap">
                    {editedText}
                  </div>
                </TabsContent>

                <TabsContent value="edit" className="m-0">
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-[400px] font-mono text-sm leading-relaxed"
                  />
                </TabsContent>
              </div>

              <div className="border-l pl-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-500" />
                  KI-Vorschläge
                </h3>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-sm cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => setEditedText(prev => `${prev}\n• ${suggestion}`)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="mt-6">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => handleConfirm(false)}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              Dokumentation abschließen
            </Button>
            <Button 
              onClick={() => handleConfirm(true)}
              className="flex-1 bg-blue-600"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Zur Überprüfung senden
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}