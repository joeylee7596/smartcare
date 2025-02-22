import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Employee, Tour, Patient } from "@shared/schema";
import { format, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar as CalendarIcon, Edit, MapPin, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import AddTourDialog from "./add-tour-dialog";
import { Badge } from "@/components/ui/badge";

interface EmployeeTourDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  initialDate: Date;
}

export function EmployeeTourDetails({
  open,
  onOpenChange,
  employee,
  initialDate,
}: EmployeeTourDetailsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const employeeTours = tours.filter(
    (tour) =>
      tour.employeeId === employee.id &&
      isSameDay(parseISO(tour.date.toString()), selectedDate)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="font-bold">{employee.name}</span>
            {employee.qualifications.nursingDegree && (
              <Badge variant="secondary">Examiniert</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left Side - Calendar */}
          <div className="w-[300px] flex-shrink-0 border-r pr-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              locale={de}
            />
            
            <div className="mt-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                Tagesübersicht
              </h3>
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
                </p>
                <p>{employeeTours.length} Touren geplant</p>
              </div>
            </div>
          </div>

          {/* Right Side - Tours List */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {employeeTours.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Keine Touren für diesen Tag geplant
                  </div>
                ) : (
                  employeeTours.map((tour) => (
                    <Card key={tour.id} className="relative group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">
                              Tour #{tour.id}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditingTour(tour)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {tour.patientIds.map((patientId) => {
                            const patient = patients.find((p) => p.id === patientId);
                            if (!patient) return null;

                            return (
                              <div
                                key={patient.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-accent/5"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <div className="font-medium">{patient.name}</div>
                                    <div className="text-sm text-gray-500">
                                      Pflegegrad {patient.careLevel}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{format(parseISO(tour.date.toString()), "HH:mm")}</span>
                          </div>
                          <Badge
                            variant={
                              tour.economicIndicator === "green"
                                ? "default"
                                : tour.economicIndicator === "yellow"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            <Euro className="h-3.5 w-3.5 mr-1" />
                            {tour.economicCalculation?.profitMargin.toFixed(1)}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>

      {editingTour && (
        <AddTourDialog
          open={true}
          onOpenChange={() => setEditingTour(null)}
          selectedDate={parseISO(editingTour.date.toString())}
          selectedEmployeeId={editingTour.employeeId}
          tourToEdit={editingTour}
        />
      )}
    </Dialog>
  );
}
