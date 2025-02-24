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
        flex items-center gap-3 p-4 rounded-xl
        bg-gradient-to-br from-white/80 to-white/40
        backdrop-blur-[2px]
        border border-white/30
        shadow-[0_8px_16px_-6px_rgba(0,0,0,0.02),0_16px_24px_-8px_rgba(0,0,0,0.01)]
        hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.03),0_20px_32px_-12px_rgba(0,0,0,0.02)]
        hover:scale-[1.02]
        cursor-grab group
        transition-all duration-500 ease-out
        transform-gpu perspective-1000
        hover:rotate-1
        before:absolute before:inset-0 before:z-[-1] before:bg-gradient-to-t before:from-white/5 before:to-white/20 before:rounded-xl before:backdrop-blur-sm
      `}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.9), ${info.bgColor.replace('bg-', '')})`,
      }}
    >
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-[4px] shadow-inner">
        <Icon className={`h-6 w-6 ${info.color} group-hover:scale-110 transition-transform duration-500`} />
      </div>
      <div>
        <div className="font-semibold text-gray-800">{info.label}</div>
        <div className="text-sm text-gray-600">{info.time}</div>
      </div>
    </div>
  );
}

function ShiftCard({ shift }: { shift: Shift }) {
  const info = ShiftTypes[shift.type as keyof typeof ShiftTypes];
  const Icon = info.icon;

  return (
    <motion.div
      className={`
        p-3 mb-2 rounded-lg
        ${shift.aiOptimized
          ? 'bg-gradient-to-br from-white/80 via-green-50/50 to-emerald-50/30 border-l-2 border-green-400/50'
          : 'bg-gradient-to-br from-white/80 via-white/60 to-transparent'}
        backdrop-blur-[4px]
        border border-white/30
        shadow-[0_4px_12px_-4px_rgba(0,0,0,0.02)]
        hover:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.03)]
        transform-gpu perspective-1000
        hover:-translate-y-0.5
        transition-all duration-500
        before:absolute before:inset-0 before:z-[-1] before:bg-gradient-to-t before:from-white/5 before:to-white/20 before:rounded-lg before:backdrop-blur-sm
      `}
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-[4px] shadow-inner">
            <Icon className={`h-4 w-4 ${info.color}`} />
          </div>
          <span className="font-medium text-gray-800">{info.label}</span>
        </div>
        {shift.aiOptimized && (
          <Tooltip>
            <TooltipTrigger>
              <div className="p-1.5 rounded-full bg-gradient-to-br from-green-100/60 to-green-50/20 backdrop-blur-[4px] shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-green-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent>KI-optimierte Schicht</TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
}

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Query for employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  // Query for shifts with explicit date range
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", { start: weekStart, end: weekEnd, department }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shifts", {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        department,
      });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data = await res.json();
      console.log('Fetched shifts:', data);
      return data;
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: string; date: Date }) => {
      let startTime = new Date(data.date);
      let endTime = new Date(data.date);

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
      }

      const shiftData = {
        employeeId: data.employeeId,
        type: data.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        department,
        breakDuration: 30,
        conflictInfo: {
          type: "overlap",
          description: "Checking for conflicts",
          severity: "low",
          status: "pending"
        },
        notes: "",
        aiGenerated: false,
        aiOptimized: false,
        status: "scheduled"
      };

      console.log('Creating shift with data:', shiftData);

      const res = await apiRequest("POST", "/api/shifts", shiftData);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Schicht konnte nicht erstellt werden");
      }

      const newShift = await res.json();
      console.log('Created shift:', newShift);
      return newShift;
    },
    onSuccess: (newShift) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });

      // Optimistically update the local data
      queryClient.setQueryData<Shift[]>(["/api/shifts", { start: weekStart, end: weekEnd, department }], (old = []) => {
        return [...old, newShift];
      });

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
      console.error("Error creating shift:", error);
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
    <Card className="border-none shadow-none bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
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
        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          <div className="space-y-6">
            {/* Week header with dates */}
            <div className="grid grid-cols-7 gap-2 mb-6 px-2">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`
                    text-center p-3 rounded-lg
                    ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      ? 'bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-100'
                      : 'bg-gradient-to-br from-gray-50/50 to-transparent'}
                    backdrop-blur-[2px]
                  `}
                >
                  <div className="font-medium text-gray-900">
                    {format(day, "EEEE", { locale: de })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(day, "dd.MM.", { locale: de })}
                  </div>
                </div>
              ))}
            </div>

            {employees.map((employee) => (
              <Card key={employee.id} className="overflow-hidden border border-gray-100">
                <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{employee.name}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const dayShifts = shifts.filter(s => {
                        const shiftDate = format(new Date(s.startTime), 'yyyy-MM-dd');
                        const currentDate = format(day, 'yyyy-MM-dd');
                        return s.employeeId === employee.id && shiftDate === currentDate;
                      });

                      const cellId = `${employee.id}_${format(day, 'yyyy-MM-dd')}`;

                      return (
                        <div
                          key={day.toISOString()}
                          className={`
                            p-2 min-h-[120px] relative
                            border-l 
                            ${dragOverCell === cellId
                              ? 'bg-gradient-to-br from-blue-50/60 to-blue-50/20 border-2 border-dashed border-blue-200/70 backdrop-blur-[4px]'
                              : 'hover:bg-gradient-to-br hover:from-gray-50/40 hover:to-transparent'}
                            transition-all duration-500
                            rounded-lg
                          `}
                          onDragOver={(e) => handleDragOver(e, cellId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, employee.id, day)}
                        >
                          <AnimatePresence>
                            {dayShifts.map((shift) => (
                              <ShiftCard key={shift.id} shift={shift} />
                            ))}
                          </AnimatePresence>

                          {dayShifts.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500">
                              <div className="p-2.5 rounded-full bg-gradient-to-br from-gray-50/60 to-white/20 backdrop-blur-[4px] shadow-inner">
                                <Plus className="h-5 w-5" />
                              </div>
                              <span className="text-xs mt-2 font-medium">Schicht hinzufügen</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ScheduleBoard;