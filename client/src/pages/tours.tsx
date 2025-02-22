import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, type InsertTour, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, RotateCw, Clock, Calendar, Search, Plus, X, Maximize2, Trash2, UserCheck, Shield, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "leaflet/dist/leaflet.css";
import { Icon } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PatientDetailsDialog } from "@/components/patients/patient-details-dialog";
import {cn} from "@/lib/utils";
import {UsersIcon, Path, Brain} from "@/components/ui/icons";


// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const compactMapStyle = {
  width: "100%",
  height: "300px",
};

const expandedMapStyle = {
  width: "100%",
  height: "80vh",
};

const center: LatLngExpression = [52.520008, 13.404954];

interface PatientCardProps {
  patient: Patient;
  onAdd: (patientId: number) => void;
  isInTour?: boolean;
  onSelect: (patient: Patient) => void;
}

function PatientCard({ patient, onAdd, isInTour, onSelect }: PatientCardProps) {
  return (
    <div
      className="p-3 mb-2 rounded-lg bg-card border border-border/40 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onSelect(patient)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{patient.name}</h3>
            <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
              PG {patient.careLevel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{patient.address}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(patient.id);
                }}
                disabled={isInTour}
              >
                {isInTour ? (
                  <X className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isInTour ? 'Patient bereits in Tour' : 'Zur Tour hinzufügen'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface FilterState {
  urgency: string;
  careType: string;
  location: string;
}

interface EmployeeCardProps {
  employee: Employee;
  onSelect: (employeeId: number) => void;
  isSelected: boolean;
  workload: number;
}

function EmployeeCard({ employee, onSelect, isSelected, workload }: EmployeeCardProps) {
  return (
    <div
      className={`p-3 mb-2 rounded-lg border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border/40 hover:shadow-md'
      }`}
      onClick={() => onSelect(employee.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{employee.name}</h3>
            <Badge variant={workload > 80 ? "destructive" : workload > 60 ? "warning" : "secondary"}>
              {workload}% Auslastung
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Briefcase className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{employee.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {employee.qualifications.nursingDegree && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="h-4 w-4 text-primary" />
                </TooltipTrigger>
                <TooltipContent>
                  Pflegeexaminiert
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(employee.qualifications)
          .filter(([key, value]) => value === true && key !== 'nursingDegree')
          .map(([key]) => (
            <Badge key={key} variant="outline" className="text-xs">
              {formatQualification(key)}
            </Badge>
          ))}
      </div>
    </div>
  );
}

function formatQualification(key: string): string {
  const mapping: Record<string, string> = {
    medicationAdministration: "Medikamentengabe",
    woundCare: "Wundversorgung",
    dementiaCare: "Demenzbetreuung",
    palliativeCare: "Palliativpflege",
    lifting: "Hebetechniken",
    firstAid: "Erste Hilfe"
  };
  return mapping[key] || key;
}

function DashboardCard({ 
  title,
  value,
  description,
  icon: Icon,
  className,
  onClick
}: { 
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<any>;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-500",
        "hover:scale-[1.02] hover:-translate-y-1",
        "rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)]",
        "border border-white/20 backdrop-blur-sm",
        "bg-gradient-to-br from-blue-500/[0.08] via-blue-400/[0.05] to-transparent",
        "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 
            text-white shadow-lg shadow-blue-500/25 
            transition-transform duration-500 group-hover:scale-110">
            <Icon weight="fill" className="h-8 w-8 transition-all duration-500 
              group-hover:scale-110 group-hover:rotate-6" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-tight bg-gradient-to-r 
              from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {value}
            </div>
            <div className="text-sm text-gray-500 mt-1">{description}</div>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-medium text-sm text-gray-600">{title}</h3>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 
          via-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 
          transition-opacity duration-500" />
      </CardContent>
    </Card>
  );
}

export default function Tours() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    urgency: "all",
    careType: "all",
    location: "all"
  });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const createTourMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const tourDate = new Date(selectedDate);
      const suggestedEmployee = suggestEmployee(patientId);

      // Find latest end time of existing tours
      const latestTour = dateFilteredTours
        .filter(tour => tour.employeeId === (suggestedEmployee?.id || selectedEmployee))
        .map(tour => {
          const waypoints = tour.optimizedRoute?.waypoints || [];
          if (waypoints.length === 0) return null;
          const lastWaypoint = waypoints[waypoints.length - 1];
          const endTime = lastWaypoint ? new Date(lastWaypoint.estimatedTime) : null;
          if (endTime && lastWaypoint) {
            endTime.setMinutes(endTime.getMinutes() + lastWaypoint.visitDuration + lastWaypoint.travelTimeToNext);
          }
          return endTime;
        })
        .filter((date): date is Date => date !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      // Set start time to either 9 AM or after the latest tour
      const startTime = latestTour || new Date(tourDate.setHours(9, 0, 0, 0));
      if (latestTour) {
        startTime.setMinutes(startTime.getMinutes() + 15); // Add buffer between tours
      }

      // Get required qualifications based on patient care level
      const patient = patients.find(p => p.id === patientId);
      const requiredQualifications = [];
      if (patient) {
        if (patient.careLevel >= 4) requiredQualifications.push('nursingDegree');
        if (patient.careLevel >= 3) {
          requiredQualifications.push('medicationAdministration');
          requiredQualifications.push('woundCare');
        }
      }

      // Generate simulated location for the new patient
      const patientLocation = {
        lat: 52.520008 + (Math.random() * 0.1 - 0.05),
        lng: 13.404954 + (Math.random() * 0.1 - 0.05)
      };

      const newTour: InsertTour = {
        date: startTime,
        employeeId: suggestedEmployee?.id || selectedEmployee || 1,
        patientIds: [patientId],
        status: "scheduled",
        optimizedRoute: {
          waypoints: [{
            patientId: patientId,
            lat: patientLocation.lat,
            lng: patientLocation.lng,
            estimatedTime: startTime.toISOString(),
            visitDuration: 30,
            travelTimeToNext: 0,
            distanceToNext: 0,
            requiredQualifications
          }],
          totalDistance: 0,
          estimatedDuration: 30
        }
      };

      const response = await apiRequest("POST", "/api/tours", newTour);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tour');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour erstellt",
        description: "Die Tour wurde erfolgreich erstellt.",
      });
    },
    onError: (error) => {
      console.error('Tour creation error:', error);
      toast({
        title: "Fehler",
        description: "Die Tour konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  });

  const updateTourMutation = useMutation({
    mutationFn: async ({ id, patientIds }: { id: number; patientIds: number[] }) => {
      if (patientIds.length === 0) {
        const response = await apiRequest("DELETE", `/api/tours/${id}`);
        if (!response.ok) {
          throw new Error('Failed to delete tour');
        }
        return null;
      }

      // Generate simulated locations for each patient
      const patientLocations = patientIds.reduce((acc, patientId) => ({
        ...acc,
        [patientId]: {
          lat: 52.520008 + (Math.random() * 0.1 - 0.05),
          lng: 13.404954 + (Math.random() * 0.1 - 0.05)
        }
      }), {});

      function calculateTravelTime(fromLat: number, fromLng: number, toLat: number, toLng: number) {
        const dx = Math.abs(fromLat - toLat);
        const dy = Math.abs(fromLng - toLng);
        const distance = Math.sqrt(dx * dx + dy * dy) * 111; // Rough km conversion
        return Math.round(distance * 2); // 2 minutes per km
      }

      const baseTime = new Date(selectedDate);
      baseTime.setHours(9, 0, 0, 0); // Start at 9 AM

      let currentTime = new Date(baseTime);
      let totalDistance = 0;
      let totalDuration = 0;

      const waypoints = patientIds.map((patientId, index) => {
        const visitDuration = 30; // Default visit duration
        const currentLocation = patientLocations[patientId];
        const nextLocation = index < patientIds.length - 1 ? patientLocations[patientIds[index + 1]] : null;

        let travelTimeToNext = 0;
        let distanceToNext = 0;

        if (nextLocation) {
          travelTimeToNext = calculateTravelTime(
            currentLocation.lat, currentLocation.lng,
            nextLocation.lat, nextLocation.lng
          );
          distanceToNext = Math.round(travelTimeToNext / 2); // Rough distance estimation
          totalDistance += distanceToNext;
        }

        const waypoint = {
          patientId,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          estimatedTime: currentTime.toISOString(),
          visitDuration,
          travelTimeToNext,
          distanceToNext
        };

        // Update time for next waypoint
        currentTime = new Date(currentTime);
        currentTime.setMinutes(currentTime.getMinutes() + visitDuration + travelTimeToNext);
        totalDuration += visitDuration + travelTimeToNext;

        return waypoint;
      });

      const optimizedRoute = {
        waypoints,
        totalDistance,
        estimatedDuration: totalDuration
      };

      const response = await apiRequest("PATCH", `/api/tours/${id}`, {
        patientIds,
        optimizedRoute
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tour');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour aktualisiert",
        description: "Die Tour wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message || "Die Tour konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  });

  const calculateWorkload = (employeeId: number) => {
    const employeeTours = dateFilteredTours.filter(tour => tour.employeeId === employeeId);
    const totalDuration = employeeTours.reduce((sum, tour) =>
      sum + (tour.optimizedRoute?.estimatedDuration || 0), 0);
    const maxMinutes = 8 * 60; // 8 hours workday
    return Math.round((totalDuration / maxMinutes) * 100);
  };

  const suggestEmployee = (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return null;

    return employees
      .filter(emp => emp.status === 'active')
      .map(emp => {
        let score = 0;

        // Score based on current workload (lower is better)
        const workload = calculateWorkload(emp.id);
        score -= workload;

        // Score based on care level match
        if (patient.careLevel >= 4 && emp.qualifications.nursingDegree) score += 50;
        if (patient.careLevel >= 3 && (emp.qualifications.medicationAdministration || emp.qualifications.woundCare)) score += 30;

        return { employee: emp, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.employee || null;
  };

  const dateFilteredTours = tours.filter(tour => {
    const tourDate = parseISO(tour.date.toString());
    return tourDate >= startOfDay(selectedDate) && tourDate <= endOfDay(selectedDate);
  });

  // Filter tours by selected employee
  const employeeTours = selectedEmployee
    ? dateFilteredTours.filter(tour => tour.employeeId === selectedEmployee)
    : dateFilteredTours;

  const patientsInTours = dateFilteredTours.flatMap(tour => tour.patientIds);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filters.urgency === "all" ||
      (filters.urgency === "urgent" && patient.careLevel >= 4) ||
      (filters.urgency === "normal" && patient.careLevel < 4);
    const matchesCareType = filters.careType === "all"; // TODO: Add care type to patient schema
    const matchesLocation = filters.location === "all"; // TODO: Add location districts
    return matchesSearch && matchesUrgency && matchesCareType && matchesLocation;
  });

  const handleAddToTour = async (patientId: number) => {
    if (!selectedEmployee) {
      toast({
        title: "Kein Mitarbeiter ausgewählt",
        description: "Bitte wählen Sie zuerst einen Mitarbeiter aus.",
        variant: "destructive",
      });
      return;
    }
    createTourMutation.mutate(patientId);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Tourenplanung
              </h1>
              <p className="text-lg text-gray-500">
                {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
              </p>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl bg-white/80 backdrop-blur-sm border border-white/40
                    hover:bg-blue-50 hover:border-blue-200
                    shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                    hover:-translate-y-0.5 hover:scale-105
                    transition-all duration-500 group"
                >
                  <Calendar className="mr-2 h-4 w-4 transition-transform duration-500
                    group-hover:scale-110 group-hover:rotate-12" />
                  {format(selectedDate, "dd. MMMM yyyy", { locale: de })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border border-white/40
                bg-white/80 backdrop-blur-sm shadow-xl">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <DashboardCard
              title="Aktive Touren"
              value={employeeTours.length}
              description={`${employeeTours.filter(t => t.status === 'active').length} laufende Touren`}
              icon={Path}
            />
            <DashboardCard
              title="Verfügbare Mitarbeiter"
              value={employees.filter(e => e.status === 'active').length}
              description="Einsatzbereit"
              icon={UserCheck}
            />
            <DashboardCard
              title="Patienten"
              value={patients.length}
              description={`${patientsInTours.length} eingeplant`}
              icon={UsersIcon}
            />
            <DashboardCard
              title="Durchschnittliche Auslastung"
              value={`${Math.round(employees.reduce((acc, emp) => acc + calculateWorkload(emp.id), 0) / employees.length)}%`}
              description="Aller Mitarbeiter"
              icon={Brain}
            />
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-[300px,1fr,300px] gap-6">
            {/* Left Sidebar: Staff Selection */}
            <Card className="rounded-2xl border border-white/40 bg-white/80
              backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
              hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
              transition-all duration-500 h-[calc(100vh-280px)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                  bg-clip-text text-transparent">Mitarbeiter</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-3">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className={cn(
                          "p-4 rounded-xl transition-all duration-300 cursor-pointer",
                          "border border-white/40 hover:border-blue-200",
                          "bg-gradient-to-r from-white to-blue-50/50",
                          "hover:from-blue-50 hover:to-blue-100/50",
                          "shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20",
                          "hover:-translate-y-0.5 hover:scale-[1.02]",
                          "group",
                          employee.id === selectedEmployee && "from-blue-50 to-blue-100/50 border-blue-200"
                        )}
                        onClick={() => setSelectedEmployee(employee.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                            text-white shadow-lg shadow-blue-500/25 
                            transition-transform duration-500 group-hover:scale-110">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{employee.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={calculateWorkload(employee.id) > 80 ? "destructive" : "secondary"}
                                className="text-xs rounded-lg font-medium px-2 py-0.5"
                              >
                                {calculateWorkload(employee.id)}% Auslastung
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Center: Map and Route Overview */}
            <div className="space-y-6">
              <Card className="rounded-2xl border border-white/40 bg-white/80
                backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
                transition-all duration-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                      bg-clip-text text-transparent">Routenübersicht</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg transition-all duration-300
                            hover:bg-blue-50 hover:text-blue-600
                            hover:scale-110 hover:rotate-12"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] rounded-2xl
                        border border-white/40 bg-white/80 backdrop-blur-sm
                        shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]">
                        <MapContainer
                          center={center}
                          zoom={13}
                          style={expandedMapStyle}
                          scrollWheelZoom
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          {employeeTours.map((tour) => (
                            tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                              <Marker
                                key={`${tour.id}-${index}`}
                                position={[waypoint.lat, waypoint.lng]}
                                icon={defaultIcon}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <p className="font-medium">Stop {index + 1}</p>
                                    <p className="text-sm text-gray-500">
                                      {patients.find(p => p.id === waypoint.patientId)?.name}
                                    </p>
                                  </div>
                                </Popup>
                              </Marker>
                            ))
                          ))}
                        </MapContainer>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <MapContainer
                    center={center}
                    zoom={13}
                    style={compactMapStyle}
                    scrollWheelZoom
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {employeeTours.map((tour) => (
                      tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                        <Marker
                          key={`${tour.id}-${index}`}
                          position={[waypoint.lat, waypoint.lng]}
                          icon={defaultIcon}
                        >
                          <Popup>
                            <div className="p-2">
                              <p className="font-medium">Stop {index + 1}</p>
                              <p className="text-sm text-gray-500">
                                {patients.find(p => p.id === waypoint.patientId)?.name}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ))
                    ))}
                  </MapContainer>
                </CardContent>
              </Card>

              {/* Tour List */}
              <Card className="rounded-2xl border border-white/40 bg-white/80
                backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
                transition-all duration-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                      bg-clip-text text-transparent">
                      Aktive Touren
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 
                        hover:bg-red-50 transition-all duration-300
                        hover:scale-110"
                      onClick={() => {
                        const tourIds = employeeTours.map(tour => tour.id);
                        tourIds.forEach(id => {
                          updateTourMutation.mutate({
                            id,
                            patientIds: []
                          });
                        });
                      }}
                      disabled={employeeTours.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {employeeTours.map((tour) => (
                        <div
                          key={tour.id}
                          className="p-4 rounded-xl bg-gradient-to-r from-white to-blue-50/50
                            border border-white/40 hover:border-blue-200
                            shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                            hover:-translate-y-1 hover:scale-[1.02]
                            transition-all duration-500 group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-500
                                transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
                                <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">
                                  {format(parseISO(tour.date.toString()), "HH:mm")}
                                </span>
                                <div className="text-sm text-gray-500">
                                  {tour.optimizedRoute?.estimatedDuration} min
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="font-medium">
                              {tour.patientIds.length} Patienten
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {tour.optimizedRoute?.waypoints.map((waypoint, index) => {
                              const patient = patients.find(p => p.id === waypoint.patientId);
                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-2 rounded-lg
                                    hover:bg-blue-50/50 transition-all duration-300
                                    cursor-pointer"
                                  onClick={() => setSelectedPatient(patient || null)}
                                >
                                  <div className="w-6 h-6 rounded-lg bg-blue-100 
                                    flex items-center justify-center text-blue-500 
                                    text-xs font-medium transition-all duration-300
                                    group-hover:scale-110 group-hover:rotate-12">
                                    {index + 1}
                                  </div>
                                  <span className="flex-1 text-gray-700 font-medium">
                                    {patient?.name || `Patient #${waypoint.patientId}`}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-lg hover:bg-red-50 
                                      hover:text-red-500 transition-all duration-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateTourMutation.mutate({
                                        id: tour.id,
                                        patientIds: tour.patientIds.filter(
                                          id => id !== waypoint.patientId
                                        )
                                      });
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {employeeTours.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
                          <p>Keine Touren geplant</p>
                          <p className="text-sm">
                            Wählen Sie Patienten aus, um eine neue Tour zu erstellen
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar: Patient Selection */}
            <Card className="rounded-2xl border border-white/40 bg-white/80
              backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
              hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
              transition-all duration-500 h-[calc(100vh-280px)]">
              <CardHeader className="pb-3">
                <div className="space-y-3">
                  <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                    bg-clip-text text-transparent">Patienten</CardTitle>
                  <div className="relative group">
                    <div className="absolute left-3 top-3 text-gray-400 transition-all 
                      duration-300 group-focus-within:scale-110 group-focus-within:text-blue-500">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="Patient suchen..."
                      className="pl-10 h-12 rounded-xl bg-white/80 backdrop-blur-sm
                        border-white/40 hover:border-blue-200 focus:border-blue-300
                        shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]
                        focus:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)]
                        transition-all duration-300"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-3 py-2">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className={cn(
                          "p-4 rounded-xl transition-all duration-300 cursor-pointer",
                          "border border-white/40 hover:border-blue-200",
                          "bg-gradient-to-r from-white to-blue-50/50",
                          "hover:from-blue-50 hover:to-blue-100/50",
                          "shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20",
                          "hover:-translate-y-0.5 hover:scale-[1.02]",
                          "group"
                        )}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br 
                              from-blue-50 to-blue-100
                              text-blue-500 shadow-lg shadow-blue-500/10 
                              transition-transform duration-500 group-hover:scale-110">
                              <UsersIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{patient.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={patient.careLevel >= 4 ? "destructive" : "secondary"}
                                  className="text-xs rounded-lg font-medium px-2 py-0.5"
                                >
                                  PG {patient.careLevel}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg transition-all duration-300
                              hover:bg-blue-50 hover:text-blue-600
                              hover:scale-110 hover:rotate-12"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToTour(patient.id);
                            }}
                            disabled={patientsInTours.includes(patient.id)}
                          >
                            {patientsInTours.includes(patient.id) ? (
                              <X className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}