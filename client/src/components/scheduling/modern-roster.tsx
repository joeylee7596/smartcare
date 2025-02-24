import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
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
  Brain,
  UserCheck,
  Star,
  Sparkles,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import type {
  Employee,
  Shift,
  ShiftTemplate,
  ShiftPreference,
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
  const [aiOptimizationOpen, setAiOptimizationOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  // Enhanced mutations
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

  // AI optimization mutation
  const optimizeScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shifts/optimize", {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        department,
      });
      if (!res.ok) throw new Error("Could not optimize schedule");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Dienstplan optimiert",
        description: `KI-Optimierung abgeschlossen mit ${data.improvements} Verbesserungen.`,
      });
    },
  });

  // Handle drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const shiftId = parseInt(active.id.toString());
    const targetTime = over.id.toString().split("-");
    const [pattern, date] = targetTime;

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // Calculate new times based on pattern
    const baseDate = new Date(date);
    let startTime = new Date(baseDate);
    let endTime = new Date(baseDate);

    switch (pattern) {
      case "early":
        startTime.setHours(6, 0);
        endTime.setHours(14, 0);
        break;
      case "late":
        startTime.setHours(14, 0);
        endTime.setHours(22, 0);
        break;
      case "night":
        startTime.setHours(22, 0);
        endTime = new Date(endTime.setDate(endTime.getDate() + 1));
        endTime.setHours(6, 0);
        break;
    }

    updateShiftMutation.mutate({
      id: shiftId,
      updates: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        rotationPattern: pattern as "early" | "late" | "night",
      },
    });
  };

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

  // AI Optimization Dialog
  const renderAiDialog = () => (
    <Dialog open={aiOptimizationOpen} onOpenChange={setAiOptimizationOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>KI-Optimierung des Dienstplans</DialogTitle>
          <DialogDescription>
            Optimierung des Dienstplans unter Berücksichtigung von Mitarbeiterpräferenzen,
            Qualifikationen und Arbeitszeiten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {selectedShift?.aiSuggestions && (
            <>
              <div className="space-y-2">
                <Label>Workload Balance</Label>
                <Progress value={selectedShift.aiSuggestions.workloadBalance.score * 100} />
                <ul className="text-sm text-muted-foreground list-disc pl-4">
                  {selectedShift.aiSuggestions.workloadBalance.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <Label>Mitarbeiterpräferenzen</Label>
                <Progress 
                  value={selectedShift.aiSuggestions.employeePreferenceMatch.score * 100}
                />
              </div>
              <div className="space-y-2">
                <Label>Vorgeschlagene Änderungen</Label>
                <div className="space-y-2">
                  {selectedShift.aiSuggestions.suggestedChanges.map((change, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm">{change.reason}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateShiftMutation.mutate({
                            id: selectedShift.id,
                            updates: {
                              [change.type]: change.suggestedValue,
                            },
                          });
                        }}
                      >
                        Anwenden
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAiOptimizationOpen(false)}
            >
              Schließen
            </Button>
            <Button
              onClick={() => optimizeScheduleMutation.mutate()}
              disabled={optimizeScheduleMutation.isPending}
            >
              {optimizeScheduleMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Optimiere...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Automatisch optimieren
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Dienstplan für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setAiOptimizationOpen(true)}>
              <Brain className="h-4 w-4 mr-2" />
              KI-Optimierung
            </Button>
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
                        key={`${pattern}-${format(day, "yyyy-MM-dd")}`}
                        className="h-24 p-2 bg-card hover:bg-accent/5 transition-colors"
                        id={`${pattern}-${format(day, "yyyy-MM-dd")}`}
                        data-droppable
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
                                  data-draggable
                                  id={shift.id.toString()}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`group relative p-2 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors cursor-move ${
                                    shift.aiOptimizationScore ? 'border-l-4 border-green-500' : ''
                                  }`}
                                  style={{
                                    ...shift.dragDropMetadata?.position && {
                                      transform: `translate(${shift.dragDropMetadata.position.x}px, ${shift.dragDropMetadata.position.y}px)`,
                                    }
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
                                    {format(new Date(shift.startTime), "HH:mm")} -{" "}
                                    {format(new Date(shift.endTime), "HH:mm")}
                                  </div>

                                  {typeof shift.aiOptimizationScore === 'number' && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge
                                          variant="secondary"
                                          className="absolute top-1 right-1"
                                        >
                                          <Sparkles className="h-3 w-3 text-green-500" />
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        KI-Optimierungsscore: {Math.round(shift.aiOptimizationScore * 100)}%
                                      </TooltipContent>
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
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          <p className="font-medium">Konflikt: {shift.conflictInfo.type}</p>
                                          <p>{shift.conflictInfo.description}</p>
                                        </div>
                                      </TooltipContent>
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

        {renderAiDialog()}

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
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedShift(selectedShift);
                    setAiOptimizationOpen(true);
                    setEditDialogOpen(false);
                  }}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  KI-Vorschläge
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}