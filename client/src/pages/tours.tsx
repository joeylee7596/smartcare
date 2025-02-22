import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Tour, Patient, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SmartSchedule } from "@/components/tours/smart-schedule";
import { useToast } from "@/hooks/use-toast";


export default function Tours() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);


  // Get patientId from URL if provided
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const patientId = searchParams.get('patient');
    if (patientId) {
      const patientIdNum = parseInt(patientId);
      const tour = tours.find(t => t.patientIds.includes(patientIdNum));
      if (tour) {
        setSelectedDate(parseISO(tour.date.toString()));
        setSelectedEmployee(tour.employeeId);
        setSelectedEmployeeForDetails(employees.find(e => e.id === tour.employeeId) || null);
        setShowEmployeeDetails(true);
      }
    }
  }, []);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const dateFilteredTours = tours.filter((tour) =>
    isSameDay(parseISO(tour.date.toString()), selectedDate)
  );

  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployeeForDetails(employee);
    setShowEmployeeDetails(true);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Top Navigation Bar */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Tourenplanung
              </h1>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="hover:bg-blue-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="hover:bg-blue-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>

          {/* Main Content */}
          <SmartSchedule
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            employees={employees}
            tours={tours}
            patients={patients}
            toast={toast}
            onEmployeeClick={handleEmployeeClick}
            setSelectedEmployee={setSelectedEmployee}
            selectedEmployee={selectedEmployee}
            showEmployeeDetails={showEmployeeDetails}
            setShowEmployeeDetails={setShowEmployeeDetails}
            selectedEmployeeForDetails={selectedEmployeeForDetails}
            setSelectedEmployeeForDetails={setSelectedEmployeeForDetails}
          />
        </main>
      </div>
    </div>
  );
}