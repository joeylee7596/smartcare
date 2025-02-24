import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ShiftTemplate, InsertTemplate } from "@shared/schema";

interface ShiftTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTemplate?: ShiftTemplate;
}

export function ShiftTemplatesDialog({ open, onOpenChange, defaultTemplate }: ShiftTemplatesDialogProps) {
  const [name, setName] = useState(defaultTemplate?.name ?? "");
  const [startTime, setStartTime] = useState(defaultTemplate?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(defaultTemplate?.endTime ?? "16:00");
  const [type, setType] = useState(defaultTemplate?.type ?? "regular");
  const [requiredQualifications, setRequiredQualifications] = useState<string[]>(defaultTemplate?.requiredQualifications ?? []);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (template: InsertTemplate) => {
      const response = await fetch("/api/shift-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      toast({
        title: "Erfolg",
        description: "Schichtvorlage wurde erstellt",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Schichtvorlage konnte nicht erstellt werden",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate.mutate({
      name,
      startTime,
      endTime,
      type,
      requiredQualifications,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Neue Schichtvorlage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Frühdienst"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Beginn</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Ende</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Schichttyp</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Schichttyp auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="early">Frühdienst</SelectItem>
                <SelectItem value="late">Spätdienst</SelectItem>
                <SelectItem value="night">Nachtdienst</SelectItem>
                <SelectItem value="regular">Normaldienst</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? "Wird erstellt..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
