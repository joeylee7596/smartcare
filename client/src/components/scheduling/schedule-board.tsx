import { useState } from "react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Clock,
  AlertTriangle,
  Shield,
  Star,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  UserCheck,
  Plus,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Employee, Shift } from "@shared/schema";

interface ScheduleBoardProps {
  selectedDate: Date;
  department: string;
  onOptimize: () => void;
}

// Helper function to get shift type info
const getShiftInfo = (type: string) => {
  switch (type) {
    case "early":
      return { icon: Sun, color: "text-yellow-500", label: "Früh (6-14)" };
    case "late":
      return { icon: Coffee, color: "text-orange-500", label: "Spät (14-22)" };
    case "night":
      return { icon: Moon, color: "text-blue-500", label: "Nacht (22-6)" };
    default:
      return { icon: Clock, color: "text-gray-500", label: "Unbekannt" };
  }
};

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get the week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch data
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 6).toISOString(),
      department,
    }],
  });

  // Update shift mutation
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
        description: "Die Änderungen wurden erfolgreich gespeichert.",
      });
    },
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: string; date: string }) => {
      const startTime = new Date(data.date);
      const endTime = new Date(data.date);

      switch (data.type) {
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
          endTime.setDate(endTime.getDate() + 1);
          endTime.setHours(6, 0);
          break;
      }

      const res = await apiRequest("POST", "/api/shifts", {
        employeeId: data.employeeId,
        type: data.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        department,
      });

      if (!res.ok) throw new Error("Failed to create shift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht erstellt",
        description: "Die neue Schicht wurde erfolgreich angelegt.",
      });
    },
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active?.id) return;

    const [type, date, employeeId] = over.id.toString().split("_");

    if (draggedShift) {
      // Update existing shift
      updateShiftMutation.mutate({
        id: draggedShift.id,
        updates: {
          type,
          employeeId: parseInt(employeeId),
          date: date,
        },
      });
    } else {
      // Create new shift
      createShiftMutation.mutate({
        employeeId: parseInt(employeeId),
        type,
        date,
      });
    }

    setDraggedShift(null);
  };

  // Group shifts by date and employee
  const shiftsByDateAndEmployee = shifts.reduce((acc, shift) => {
    const date = format(new Date(shift.startTime), "yyyy-MM-dd");
    const employeeId = shift.employeeId;

    if (!acc[date]) acc[date] = {};
    if (!acc[date][employeeId]) acc[date][employeeId] = [];

    acc[date][employeeId].push(shift);
    return acc;
  }, {} as Record<string, Record<number, Shift[]>>);

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="flex gap-4">
                {["early", "late", "night"].map(type => {
                  const info = getShiftInfo(type);
                  const Icon = info.icon;
                  return (
                    <Badge 
                      key={type}
                      variant="outline" 
                      className="cursor-grab"
                      data-draggable
                      id={`new_${type}`}
                    >
                      <Icon className={`h-4 w-4 mr-2 ${info.color}`} />
                      {info.label}
                    </Badge>
                  );
                })}
              </div>
            </CardTitle>
            <Button 
              onClick={onOptimize} 
              className="bg-gradient-to-r from-blue-500 to-blue-600"
            >
              <Brain className="h-4 w-4 mr-2" />
              KI-Optimierung starten
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="min-w-[1200px]">
              {/* Header row with dates */}
              <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-2 mb-4">
                <div className="px-4 py-2">Mitarbeiter</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`px-4 py-2 text-center rounded-md ${
                      format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-blue-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">
                      {format(day, "EEEE", { locale: de })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(day, "dd.MM.")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Employee rows */}
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[200px_repeat(7,1fr)] gap-2"
                  >
                    {/* Employee info */}
                    <div className="px-4 py-2">
                      <div className="font-medium">{employee.name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {employee.role === 'nurse' && (
                          <Badge variant="secondary" className="h-5">
                            <Shield className="h-3 w-3 mr-1" />
                            Examiniert
                          </Badge>
                        )}
                        {employee.qualifications?.woundCare && (
                          <Badge variant="outline" className="h-5">
                            <Star className="h-3 w-3 mr-1" />
                            Wundexperte
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Shift cells for each day */}
                    {weekDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const dayShifts = shiftsByDateAndEmployee[dateStr]?.[employee.id] || [];

                      return (
                        <div
                          key={dateStr}
                          className="grid grid-rows-3 gap-1 p-2 rounded-md border hover:bg-gray-50/50"
                        >
                          {["early", "late", "night"].map((type) => {
                            const info = getShiftInfo(type);
                            const Icon = info.icon;
                            const shiftsOfType = dayShifts.filter(s => s.type === type);

                            return (
                              <div
                                key={`${type}_${dateStr}_${employee.id}`}
                                id={`${type}_${dateStr}_${employee.id}`}
                                className={`
                                  min-h-[40px] rounded-md border border-dashed
                                  ${shiftsOfType.length > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}
                                  p-1 transition-colors
                                `}
                                data-droppable
                              >
                                {shiftsOfType.map((shift) => (
                                  <motion.div
                                    key={shift.id}
                                    id={shift.id.toString()}
                                    data-draggable
                                    className="group p-2 rounded-md cursor-grab bg-white shadow-sm border border-gray-100"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onMouseDown={() => setDraggedShift(shift)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${info.color}`} />
                                        <span className="text-sm">
                                          {format(new Date(shift.startTime), "HH:mm")}
                                        </span>
                                      </div>
                                      {shift.aiOptimized && (
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Sparkles className="h-4 w-4 text-green-500" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            KI-optimierte Schicht
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}

                                {shiftsOfType.length === 0 && (
                                  <div
                                    className="flex items-center justify-center h-full text-gray-400 text-sm"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </DndContext>
  );
}