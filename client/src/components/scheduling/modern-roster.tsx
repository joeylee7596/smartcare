import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  AlertTriangle,
  UserPlus,
  Settings,
  RefreshCw,
  Moon,
  Sun,
  Sunrise,
  FileClock,
  Brain,
  FileText,
  Users,
  Edit3,
  UserCheck,
  Star,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type {
  Employee,
  Shift,
  ShiftTemplate,
  ShiftPreference,
  Documentation
} from "@shared/schema";

interface ModernRosterProps {
  selectedDate: Date;
  department: string;
  view: "daily" | "weekly";
  scheduleMode: "manual" | "auto";
}

const ShiftPatternIcons = {
  early: <Sunrise className="h-4 w-4 text-yellow-500" />,
  late: <Sun className="h-4 w-4 text-orange-500" />,
  night: <Moon className="h-4 w-4 text-blue-500" />,
};

export function ModernRoster({ selectedDate, department, view, scheduleMode }: ModernRosterProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [documentationDialogOpen, setDocumentationDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  // Enhanced queries with proper error handling
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      department,
    }],
  });

  const { data: preferences = [] } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/shift-preferences"],
  });

  // Mutation for updating shifts
  const updateShiftMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Shift> }) => {
      const res = await apiRequest("PATCH", `/api/shifts/${data.id}`, data.updates);
      if (!res.ok) throw new Error("Failed to update shift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
      setEditDialogOpen(false);
    },
  });

  // AI suggestion mutation
  const getAiSuggestionsMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await apiRequest("POST", "/api/shifts/suggest", { shiftId });
      if (!res.ok) throw new Error("Could not get suggestions");
      return res.json();
    },
  });

  // Documentation mutation
  const createDocumentationMutation = useMutation({
    mutationFn: async (data: { shiftId: number; content: string }) => {
      const res = await apiRequest("POST", "/api/documentation", data);
      if (!res.ok) throw new Error("Failed to create documentation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentation"] });
      toast({
        title: "Dokumentation erstellt",
        description: "Die Dokumentation wurde erfolgreich gespeichert.",
      });
      setDocumentationDialogOpen(false);
    },
  });

  // Group shifts by day and employee
  const shiftsByDay = shifts.reduce((acc, shift) => {
    const day = format(new Date(shift.startTime), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = {};
    if (!acc[day][shift.employeeId]) acc[day][shift.employeeId] = [];
    acc[day][shift.employeeId].push(shift);
    return acc;
  }, {} as Record<string, Record<number, Shift[]>>);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Render employee qualifications badges
  const renderQualifications = (employee: Employee) => {
    const quals = employee.qualifications || {};
    return (
      <div className="flex gap-1">
        {quals.nursingDegree && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="h-5">
                <Star className="h-3 w-3 text-yellow-500" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Examinierte Pflegekraft</TooltipContent>
          </Tooltip>
        )}
        {quals.woundCare && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="h-5">
                <UserCheck className="h-3 w-3 text-purple-500" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Wundexperte</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Dienstplan für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {scheduleMode === "auto" && (
            <Button>
              <Brain className="h-4 w-4 mr-2" />
              KI-Vorschläge anwenden
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[auto,1fr] gap-4 bg-card rounded-lg border">
        {/* Time slots */}
        <div className="w-48 pt-16 pb-4 px-4">
          <div className="space-y-2">
            {["Früh", "Spät", "Nacht"].map((shift) => (
              <div
                key={shift}
                className="h-24 flex items-center text-sm text-muted-foreground"
              >
                {shift}
              </div>
            ))}
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-px bg-muted">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="bg-card">
              <div className="p-2 text-center border-b">
                <div className="font-medium">
                  {format(day, "EEEE", { locale: de })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(day, "dd.MM.")}
                </div>
              </div>

              {/* Shift slots */}
              <div className="space-y-px">
                {["early", "late", "night"].map((pattern) => {
                  const dayShifts = shiftsByDay[format(day, "yyyy-MM-dd")] || {};
                  const patternShifts = Object.values(dayShifts)
                    .flat()
                    .filter((s) => s.rotationPattern === pattern);

                  return (
                    <div
                      key={pattern}
                      className="h-24 p-2 bg-card hover:bg-accent/5 transition-colors"
                    >
                      <ScrollArea className="h-full">
                        <div className="space-y-1">
                          {patternShifts.map((shift) => {
                            const employee = employees.find(
                              (e) => e.id === shift.employeeId
                            );
                            if (!employee) return null;

                            return (
                              <motion.div
                                key={shift.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative p-2 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedShift(shift);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {ShiftPatternIcons[shift.rotationPattern as keyof typeof ShiftPatternIcons]}
                                    <span className="text-sm font-medium truncate">
                                      {employee.name}
                                    </span>
                                  </div>
                                  {renderQualifications(employee)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {format(parseISO(shift.startTime), "HH:mm")} -{" "}
                                  {format(parseISO(shift.endTime), "HH:mm")}
                                </div>

                                {shift.notes && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge
                                        variant="secondary"
                                        className="absolute top-1 right-1"
                                      >
                                        <FileText className="h-3 w-3" />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{shift.notes}</TooltipContent>
                                  </Tooltip>
                                )}

                                {shift.conflictInfo && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge
                                        variant="destructive"
                                        className="absolute top-1 right-1"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{shift.conflictInfo}</TooltipContent>
                                  </Tooltip>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schicht bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details dieser Schicht
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Notizen</Label>
                <Input
                  defaultValue={selectedShift.notes || ""}
                  onChange={(e) =>
                    updateShiftMutation.mutate({
                      id: selectedShift.id,
                      updates: { notes: e.target.value },
                    })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDocumentationDialogOpen(true);
                    setEditDialogOpen(false);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dokumentieren
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => getAiSuggestionsMutation.mutate(selectedShift.id)}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  KI-Vorschläge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Documentation Dialog */}
      <Dialog open={documentationDialogOpen} onOpenChange={setDocumentationDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Dokumentation erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Dokumentation für diese Schicht
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Inhalt</Label>
                <textarea
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Dokumentation eingeben..."
                  onChange={(e) =>
                    createDocumentationMutation.mutate({
                      shiftId: selectedShift.id,
                      content: e.target.value,
                    })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDocumentationDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() =>
                    createDocumentationMutation.mutate({
                      shiftId: selectedShift.id,
                      content: "Test content", // Replace with actual content
                    })
                  }
                  disabled={createDocumentationMutation.isPending}
                >
                  {createDocumentationMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Speichern
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}