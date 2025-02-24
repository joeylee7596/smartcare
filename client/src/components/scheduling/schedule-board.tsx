import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Plus,
  Trash2,
  Edit,
  Calendar,
  HeartPulse,
  Timer,
  GraduationCap,
  Phone,
  CalendarOff,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import type { Employee, Shift } from "@shared/schema";

interface ScheduleBoardProps {
  selectedDate: Date;
  department: string;
  onOptimize: () => void;
}

const ShiftTypes = {
  early: { icon: Sun, color: "text-yellow-500", bgColor: "bg-yellow-50", label: "Früh", time: "06:00 - 14:00" },
  late: { icon: Coffee, color: "text-orange-500", bgColor: "bg-orange-50", label: "Spät", time: "14:00 - 22:00" },
  night: { icon: Moon, color: "text-blue-500", bgColor: "bg-blue-50", label: "Nacht", time: "22:00 - 06:00" },
  vacation: { icon: Calendar, color: "text-green-500", bgColor: "bg-green-50", label: "Urlaub", time: "Ganztägig" },
  sick: { icon: HeartPulse, color: "text-red-500", bgColor: "bg-red-50", label: "Krank", time: "Ganztägig" },
  overtime_reduction: { icon: Timer, color: "text-purple-500", bgColor: "bg-purple-50", label: "Überstundenabbau", time: "Ganztägig" },
  training: { icon: GraduationCap, color: "text-indigo-500", bgColor: "bg-indigo-50", label: "Fortbildung", time: "Ganztägig" },
  on_call: { icon: Phone, color: "text-cyan-500", bgColor: "bg-cyan-50", label: "Bereitschaft", time: "24 Stunden" },
  holiday: { icon: CalendarOff, color: "text-gray-500", bgColor: "bg-gray-50", label: "Feiertag", time: "Ganztägig" },
} as const;

function ShiftTemplate({ type }: { type: keyof typeof ShiftTypes }) {
  const info = ShiftTypes[type];
  const Icon = info.icon;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        flex items-center gap-2 p-3 rounded-lg
        ${info.bgColor} border-2 border-dashed
        cursor-grab group
        hover:border-solid hover:shadow-sm
        transition-all
      `}
    >
      <Icon className={`h-5 w-5 ${info.color} group-hover:scale-110 transition-transform`} />
      <div>
        <div className="font-medium">{info.label}</div>
        <div className="text-xs text-gray-500">{info.time}</div>
      </div>
    </div>
  );
}

function ShiftCard({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }) {
  const info = ShiftTypes[shift.type as keyof typeof ShiftTypes];
  const Icon = info.icon;

  return (
    <motion.div
      className={`
        p-2 mb-1 rounded-md
        ${shift.aiOptimized ? 'bg-green-50 border-l-2 border-green-500' : `${info.bgColor} border`}
        hover:shadow-md transition-all group
      `}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${info.color}`} />
          <div>
            <span className="text-sm font-medium">{info.label}</span>
            <div className="text-xs text-gray-500">{info.time}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {shift.aiOptimized && (
            <Tooltip>
              <TooltipTrigger>
                <Sparkles className="h-4 w-4 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>KI-optimierte Schicht</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Aktionen</span>
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Bearbeiten</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Löschen</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {shift.notes && (
        <div className="mt-1 text-xs text-gray-500">
          {shift.notes}
        </div>
      )}
    </motion.div>
  );
}

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", { start: weekStart, end: weekEnd, department }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shifts", {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        department,
      });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: string; date: Date }) => {
      let startTime = new Date(data.date);
      let endTime = new Date(data.date);

      const isFullDay = ["vacation", "sick", "overtime_reduction", "holiday"].includes(data.type);

      if (isFullDay) {
        startTime.setHours(0, 0, 0);
        endTime.setHours(23, 59, 59);
      } else {
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
            endTime = addDays(endTime, 1);
            endTime.setHours(6, 0);
            break;
          case "on_call":
            startTime.setHours(0, 0);
            endTime = addDays(endTime, 1);
            endTime.setHours(0, 0);
            break;
        }
      }

      const shiftData = {
        employeeId: data.employeeId,
        type: data.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        department,
        breakDuration: isFullDay ? 0 : 30,
        conflictInfo: {
          type: "overlap",
          description: "Checking for conflicts",
          severity: "low",
        },
        notes: "",
        aiGenerated: false,
        aiOptimized: false,
        status: "scheduled"
      };

      const res = await apiRequest("POST", "/api/shifts", shiftData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Schicht konnte nicht erstellt werden");
      }
      return res.json();
    },
    onSuccess: (newShift) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht erstellt",
        description: "Die neue Schicht wurde erfolgreich angelegt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Die Schicht konnte nicht erstellt werden",
        variant: "destructive",
      });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      if (!res.ok) throw new Error("Schicht konnte nicht gelöscht werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht gelöscht",
        description: "Die Schicht wurde erfolgreich gelöscht.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Die Schicht konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, employeeId: number, date: Date) => {
    e.preventDefault();
    setDragOverCell(null);

    const shiftType = e.dataTransfer.getData('text/plain');
    if (!shiftType) return;

    try {
      await createShiftMutation.mutateAsync({
        employeeId,
        type: shiftType,
        date,
      });
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(ShiftTypes) as Array<keyof typeof ShiftTypes>).map((type) => (
              <ShiftTemplate key={type} type={type} />
            ))}
          </div>
          <Button 
            onClick={onOptimize}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            KI-Optimierung
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="min-w-[1200px]">
            {/* Header row with dates */}
            <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b">
              <div className="p-4 font-medium">Mitarbeiter</div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`p-4 text-center ${
                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      ? 'bg-blue-50'
                      : ''
                  }`}
                >
                  <div className="font-medium">
                    {format(day, "EEEE", { locale: de })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(day, "dd.MM.")}
                  </div>
                </div>
              ))}
            </div>

            {/* Employee rows */}
            <div>
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50/50"
                >
                  {/* Employee info */}
                  <div className="p-4">
                    <div className="font-medium">{employee.name}</div>
                  </div>

                  {/* Shift cells for each day */}
                  {weekDays.map((day) => {
                    const dayShifts = shifts.filter(s => 
                      s.employeeId === employee.id && 
                      format(new Date(s.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    );

                    const cellId = `${employee.id}_${format(day, 'yyyy-MM-dd')}`;

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          p-2 min-h-[120px] border-l relative
                          ${dragOverCell === cellId ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}
                          hover:bg-gray-50/50
                          transition-all
                        `}
                        onDragOver={(e) => handleDragOver(e, cellId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, employee.id, day)}
                      >
                        <AnimatePresence>
                          {dayShifts.map((shift) => (
                            <ShiftCard
                              key={shift.id}
                              shift={shift}
                              onEdit={() => setEditingShift(shift)}
                              onDelete={() => deleteShiftMutation.mutate(shift.id)}
                            />
                          ))}
                        </AnimatePresence>

                        {dayShifts.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500">
                            <Plus className="h-5 w-5" />
                            <span className="text-xs mt-1">Schicht hinzufügen</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>

      {/* Edit Dialog would go here */}
      <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schicht bearbeiten</DialogTitle>
          </DialogHeader>
          {/* Edit form would go here */}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ScheduleBoard;