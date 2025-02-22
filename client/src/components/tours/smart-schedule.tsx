import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Tour, Employee, Patient } from "@shared/schema";
import { 
  Brain, 
  Calendar, 
  Users, 
  ArrowRight, 
  Sparkles, 
  Timer, 
  Clock,
  Plus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AddTourDialog from "./add-tour-dialog";

interface SmartScheduleProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function SmartSchedule({ selectedDate, onDateChange }: SmartScheduleProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [showAddTour, setShowAddTour] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tours/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate.toISOString() })
      });
      if (!response.ok) throw new Error("Optimization failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Optimierung abgeschlossen",
        description: "Die KI hat den Zeitplan für maximale Effizienz optimiert."
      });
    }
  });

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      await optimizeMutation.mutateAsync();
    } finally {
      setIsOptimizing(false);
    }
  };

  // Group tours by time slots
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const time = new Date(selectedDate);
    time.setHours(i + 6, 0, 0, 0);
    return time;
  });

  const getToursBySlot = (hour: number) => {
    return tours.filter(tour => {
      const tourDate = new Date(tour.date);
      return tourDate.getHours() === hour && 
             tourDate.getDate() === selectedDate.getDate();
    });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header with AI Optimization */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Brain className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">KI-optimierter Dienstplan</h2>
            <p className="text-sm text-gray-600">
              {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="bg-white"
          onClick={handleOptimize}
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <>
              <Timer className="h-4 w-4 mr-2 animate-spin" />
              Optimiere...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              KI-Optimierung
            </>
          )}
        </Button>
      </div>

      {/* Main Schedule Grid */}
      <div className="flex-1 grid grid-cols-[auto,1fr] gap-4 min-h-0">
        {/* Employee List */}
        <div className="w-[200px] bg-gray-50/50 rounded-lg border p-2">
          <ScrollArea className="h-[calc(100vh-240px)]">
            <div className="space-y-1 p-2">
              {employees.map(employee => (
                <motion.button
                  key={employee.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedEmployee(
                    selectedEmployee === employee.id ? null : employee.id
                  )}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors",
                    "hover:bg-blue-50 hover:text-blue-700",
                    selectedEmployee === employee.id && "bg-blue-100 text-blue-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-sm">{employee.name}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Time Slots Grid */}
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-2 p-4">
            {timeSlots.map((slot, index) => {
              const toursInSlot = getToursBySlot(slot.getHours());
              const filteredTours = selectedEmployee 
                ? toursInSlot.filter(t => t.employeeId === selectedEmployee)
                : toursInSlot;

              return (
                <div
                  key={index}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    "hover:bg-gray-50/80",
                    index % 2 === 0 ? "bg-gray-50/40" : "bg-white"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      {format(slot, "HH:mm")}
                    </span>
                  </div>
                  <AnimatePresence>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredTours.map(tour => {
                        const employee = employees.find(e => e.id === tour.employeeId);
                        if (!employee) return null;

                        return (
                          <motion.div
                            key={tour.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-3 rounded-lg bg-white border shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-blue-100">
                                  <Users className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                <span className="font-medium text-sm">
                                  {employee.name}
                                </span>
                              </div>
                              {tour.optimizationScore && (
                                <div className="flex items-center gap-1 text-purple-600 text-xs">
                                  <Brain className="h-3 w-3" />
                                  {tour.optimizationScore}%
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              {tour.patientIds.map(patientId => {
                                const patient = patients.find(p => p.id === patientId);
                                if (!patient) return null;

                                return (
                                  <div
                                    key={patient.id}
                                    className="text-sm text-gray-600 flex items-center gap-1"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    {patient.name}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 shadow-lg"
        onClick={() => setShowAddTour(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Neue Tour
      </Button>

      {/* Add Tour Dialog */}
      <AddTourDialog
        open={showAddTour}
        onOpenChange={setShowAddTour}
        selectedDate={selectedDate}
        selectedEmployeeId={selectedEmployee}
      />
    </div>
  );
}