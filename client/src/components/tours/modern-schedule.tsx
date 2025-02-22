import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { Tour, Employee, Patient } from "@shared/schema";
import { useGesture } from "@use-gesture/react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Brain,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  Timer,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import AddTourDialog from "./add-tour-dialog";

interface ModernScheduleProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function ModernSchedule({ selectedDate, onDateChange }: ModernScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);
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

  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["/api/tours/insights", selectedDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/tours/insights?date=${selectedDate.toISOString()}`);
      if (!response.ok) throw new Error("Failed to fetch insights");
      return response.json();
    },
  });

  // Group tours by time slots (6:00 - 22:00)
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
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
    <MotionConfig reducedMotion="user">
      <div className="h-full flex flex-col gap-4">
        {/* AI Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-blue-100">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">KI-Assistenz</h2>
                <p className="text-sm text-gray-600">
                  Optimierungsvorschläge für {format(selectedDate, "EEEE", { locale: de })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4"
              >
                {isLoadingInsights ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Timer className="h-4 w-4 animate-spin" />
                    Analysiere Zeitplan...
                  </div>
                ) : insights ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {insights.workloadBalance.map((wb) => {
                        const employee = employees.find(e => e.id === wb.employeeId);
                        return (
                          <Card key={wb.employeeId} className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{employee?.name}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${wb.currentLoad}%` }}
                                />
                              </div>
                              <p className="text-sm text-gray-600">{wb.recommendation}</p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="p-4 rounded-lg bg-white/50 backdrop-blur-sm">
                      <h3 className="font-medium mb-2">Optimierungsvorschläge</h3>
                      <ul className="space-y-2">
                        {insights.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-blue-500" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Schedule Grid */}
        <div className="flex-1 grid grid-cols-[200px,1fr] gap-6 min-h-0">
          {/* Employee List */}
          <Card className="bg-gray-50/50">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-4 space-y-2">
                {employees.map(employee => (
                  <motion.button
                    key={employee.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveEmployeeId(
                      activeEmployeeId === employee.id ? null : employee.id
                    )}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all",
                      "hover:bg-blue-50 hover:text-blue-700",
                      activeEmployeeId === employee.id && "bg-blue-100 text-blue-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium text-sm">{employee.name}</span>
                    </div>
                    {employee.qualifications.nursingDegree && (
                      <Badge variant="secondary" className="mt-2">
                        Examiniert
                      </Badge>
                    )}
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Time Slots */}
          <Card>
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-4 space-y-2">
                {timeSlots.map((slot, index) => {
                  const toursInSlot = getToursBySlot(slot.getHours());
                  const filteredTours = activeEmployeeId
                    ? toursInSlot.filter(t => t.employeeId === activeEmployeeId)
                    : toursInSlot;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg transition-colors",
                        "group hover:bg-gray-50/80",
                        index % 2 === 0 ? "bg-gray-50/40" : "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-600">
                          {format(slot, "HH:mm")}
                        </span>
                      </div>

                      <AnimatePresence>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredTours.map(tour => {
                            const employee = employees.find(e => e.id === tour.employeeId);
                            if (!employee) return null;

                            return (
                              <motion.div
                                key={tour.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative"
                              >
                                <Card className="p-3 hover:shadow-lg transition-all duration-300">
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
                                      <Badge variant="outline" className="bg-purple-50">
                                        <Brain className="h-3 w-3 mr-1" />
                                        {tour.optimizationScore}%
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="space-y-1.5">
                                    {tour.patientIds.map(patientId => {
                                      const patient = patients.find(p => p.id === patientId);
                                      if (!patient) return null;

                                      return (
                                        <div
                                          key={patient.id}
                                          className="text-sm text-gray-600 flex items-center gap-1.5"
                                        >
                                          <ArrowRight className="h-3 w-3" />
                                          <span>{patient.name}</span>
                                          <Badge variant="outline" className="ml-auto">
                                            PG {patient.careLevel}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </Card>
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
          </Card>
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full shadow-lg">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Einstellungen</SheetTitle>
                <SheetDescription>
                  Passen Sie die Ansicht und KI-Funktionen an
                </SheetDescription>
              </SheetHeader>
              {/* Add settings content */}
            </SheetContent>
          </Sheet>

          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => setShowAddTour(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Tour
          </Button>
        </div>

        <AddTourDialog
          open={showAddTour}
          onOpenChange={setShowAddTour}
          selectedDate={selectedDate}
          selectedEmployeeId={activeEmployeeId}
        />
      </div>
    </MotionConfig>
  );
}
