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
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Tourenplanung</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </div>

          <div className="grid grid-cols-[350px,1fr,350px] gap-6">
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mitarbeiter</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {employees.map((employee) => (
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        onSelect={setSelectedEmployee}
                        isSelected={employee.id === selectedEmployee}
                        workload={calculateWorkload(employee.id)}
                      />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <div className="space-y-3">
                    <CardTitle className="text-base">Patienten</CardTitle>

                    {/* Enhanced Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Patient suchen..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(selectedDate, "PPP", { locale: de })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" style={{ zIndex: 100 }}>
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Enhanced Filters */}
                    <div className="space-y-2">
                      <Select
                        value={filters.urgency}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Dringlichkeit" />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 100 }}>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="urgent">Dringend</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.careType}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, careType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pflegeart" />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 100 }}>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="basic">Grundpflege</SelectItem>
                          <SelectItem value="medical">Medizinische Pflege</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.location}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Standort" />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 100 }}>
                          <SelectItem value="all">Alle Bezirke</SelectItem>
                          <SelectItem value="north">Nord</SelectItem>
                          <SelectItem value="south">Süd</SelectItem>
                          <SelectItem value="east">Ost</SelectItem>
                          <SelectItem value="west">West</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    {filteredPatients.map((patient) => (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        onAdd={handleAddToTour}
                        isInTour={patientsInTours.includes(patient.id)}
                        onSelect={setSelectedPatient}
                      />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg overflow-hidden relative">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Karte</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh]" style={{ zIndex: 1000 }}>
                    <div className="relative w-full h-full">
                      <MapContainer
                        center={center}
                        zoom={13}
                        style={expandedMapStyle}
                        scrollWheelZoom
                        className="relative"
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {dateFilteredTours.map((tour) => (
                          tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                            <Marker
                              key={`${tour.id}-${index}`}
                              position={[waypoint.lat, waypoint.lng] as LatLngExpression}
                              icon={defaultIcon}
                            >
                              <Popup>
                                <div className="p-2">
                                  <p className="font-medium">Stop {index + 1}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {patients.find(p => p.id === waypoint.patientId)?.name || `Patient #${waypoint.patientId}`}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          ))
                        ))}
                      </MapContainer>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative" style={{ zIndex: 0 }}>
                  <MapContainer
                    center={center}
                    zoom={13}
                    style={compactMapStyle}
                    scrollWheelZoom
                    className="relative"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {dateFilteredTours.map((tour) => (
                      tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                        <Marker
                          key={`${tour.id}-${index}`}
                          position={[waypoint.lat, waypoint.lng] as LatLngExpression}
                          icon={defaultIcon}
                        >
                          <Popup className="leaflet-popup-content-wrapper">
                            <div className="p-2">
                              <p className="font-medium">Stop {index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                {patients.find(p => p.id === waypoint.patientId)?.name || `Patient #${waypoint.patientId}`}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ))
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selectedEmployee 
                      ? `Zeitplan: ${employees.find(e => e.id === selectedEmployee)?.name}`
                      : "Zeitplan: Alle Mitarbeiter"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      // Get tour IDs for the selected employee and date
                      const tourIds = employeeTours.map(tour => tour.id);

                      // Delete each tour
                      tourIds.forEach(id => {
                        updateTourMutation.mutate({
                          id,
                          patientIds: []
                        });
                      });

                      toast({
                        title: "Zeitplan gelöscht",
                        description: "Alle Touren für diesen Tag wurden entfernt.",
                      });
                    }}
                    disabled={employeeTours.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-350px)]">
                  {employeeTours.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>Keine Touren für {selectedEmployee ? "diesen Mitarbeiter" : "diesen Tag"} geplant</p>
                      <p className="text-sm">
                        {selectedEmployee 
                          ? "Fügen Sie Patienten hinzu, um eine neue Tour zu erstellen"
                          : "Wählen Sie einen Mitarbeiter aus und fügen Sie Patienten hinzu"}
                      </p>
                    </div>
                  ) : (
                    employeeTours.map((tour) => (
                      <div
                        key={tour.id}
                        className="p-4 mb-4 rounded-lg bg-card border border-border/40 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(parseISO(tour.date.toString()), "HH:mm")}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {tour.optimizedRoute?.estimatedDuration} min
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tour.optimizedRoute?.waypoints.map((waypoint, index) => {
                            const patient = patients.find(p => p.id === waypoint.patientId);
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                                onClick={() => setSelectedPatient(patient || null)}
                              >
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                  {index + 1}
                                </div>
                                <span className="flex-1 truncate">
                                  {patient?.name || `Patient #${waypoint.patientId}`}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTourMutation.mutate({
                                      id: tour.id,
                                      patientIds: tour.patientIds.filter(id => id !== waypoint.patientId)
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <PatientDetailsDialog
            patient={selectedPatient}
            open={!!selectedPatient}
            onOpenChange={(open) => !open && setSelectedPatient(null)}
          />
        </main>
      </div>
    </div>
  );
}