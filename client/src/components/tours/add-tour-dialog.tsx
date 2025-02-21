import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertTour, insertTourSchema, Patient } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Route, Brain, Plus, X, Clock, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { motion, AnimatePresence } from "framer-motion";

export function AddTourDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [selectedPatients, setSelectedPatients] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { sendMessage, subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const form = useForm<InsertTour>({
    resolver: zodResolver(insertTourSchema),
    defaultValues: {
      caregiverId: user?.id,
      patientIds: [],
      status: "scheduled",
    },
  });

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'OPTIMIZED_TOUR') {
        setOptimizedRoute(message.workflow);
        setIsOptimizing(false);
        form.setValue("optimizedRoute", message.workflow);

        toast({
          title: "KI-Optimierung abgeschlossen",
          description: `Die Route wurde optimal für ${message.workflow.waypoints.length} Patienten geplant.`,
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, form, toast]);

  const optimizeRoute = async (patients: Patient[]) => {
    if (!patients.length) return;

    setIsOptimizing(true);
    sendMessage({
      type: 'OPTIMIZE_TOUR',
      patients: patients,
    });

    toast({
      title: "KI-Optimierung läuft",
      description: "Analysiere Patientenbedürfnisse und optimiere die Route...",
    });
  };

  const addPatient = (patientId: string) => {
    const patient = patients.find(p => p.id.toString() === patientId);
    if (patient && !selectedPatients.find(p => p.id === patient.id)) {
      const newPatients = [...selectedPatients, patient];
      setSelectedPatients(newPatients);
      form.setValue("patientIds", newPatients.map(p => p.id));
      optimizeRoute(newPatients);
    }
  };

  const removePatient = (patientId: number) => {
    const newPatients = selectedPatients.filter(p => p.id !== patientId);
    setSelectedPatients(newPatients);
    form.setValue("patientIds", newPatients.map(p => p.id));

    // Clear optimized route if no patients are left
    if (newPatients.length === 0) {
      setOptimizedRoute(null);
      form.setValue("optimizedRoute", null);
    } else {
      // Recalculate route for remaining patients
      optimizeRoute(newPatients);
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertTour) => {
      // Generate simulated locations for each patient
      const patientLocations = data.patientIds.reduce((acc, patientId) => ({
        ...acc,
        [patientId]: {
          lat: 52.520008 + (Math.random() * 0.1 - 0.05), // Simulate different locations
          lng: 13.404954 + (Math.random() * 0.1 - 0.05)
        }
      }), {} as Record<number, { lat: number; lng: number }>);

      function calculateTravelTime(fromLat: number, fromLng: number, toLat: number, toLng: number) {
        const dx = Math.abs(fromLat - toLat);
        const dy = Math.abs(fromLng - toLng);
        const distance = Math.sqrt(dx * dx + dy * dy) * 111; // Rough km conversion
        return Math.round(distance * 2); // 2 minutes per km
      }

      const baseTime = new Date(data.date);
      baseTime.setHours(9, 0, 0, 0); // Start at 9 AM

      let currentTime = new Date(baseTime);
      let totalDistance = 0;
      let totalDuration = 0;

      const waypoints = data.patientIds.map((patientId, index) => {
        const visitDuration = 30; // Default visit duration
        const currentLocation = patientLocations[patientId];
        const nextLocation = index < data.patientIds.length - 1
          ? patientLocations[data.patientIds[index + 1]]
          : null;

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

      const tourData = {
        ...data,
        optimizedRoute
      };

      const res = await apiRequest("POST", "/api/tours", tourData);
      if (!res.ok) {
        throw new Error('Failed to create tour');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour erfolgreich geplant",
        description: "Die optimierte Tour wurde in Ihren Tagesplan aufgenommen.",
      });

      // Reset form and close dialog
      form.reset();
      setOptimizedRoute(null);
      setSelectedPatients([]);
      setIsOpen(false);

      // Notify other clients about the new tour
      sendMessage({
        type: 'TOUR_UPDATE',
        tour: data,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Tour konnte nicht angelegt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tour planen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Neue Tour planen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-[400px,1fr] gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patienten zur Tour hinzufügen</FormLabel>
                      <div className="space-y-4">
                        <Select
                          onValueChange={addPatient}
                          value=""
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Patient auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {patients
                              .filter(p => !selectedPatients.find(sp => sp.id === p.id))
                              .map((patient) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <div className="space-y-2">
                          <AnimatePresence>
                            {selectedPatients.map((patient) => (
                              <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between p-2 rounded-lg bg-accent"
                              >
                                <span>{patient.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removePatient(patient.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                {isOptimizing ? (
                  <div className="flex items-center justify-center p-8 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <div className="text-blue-700 text-sm text-center">
                        <p className="font-medium">KI optimiert die Route</p>
                        <p className="text-blue-600">Analysiere Patientenbedürfnisse...</p>
                      </div>
                    </div>
                  </div>
                ) : optimizedRoute && (
                  <div className="space-y-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-center justify-between text-blue-700">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <p className="font-medium">Optimierte Route</p>
                      </div>
                      <div className="text-sm">
                        Gesamtdauer: {optimizedRoute.estimatedDuration} Min
                      </div>
                    </div>

                    <div className="space-y-3">
                      {optimizedRoute.waypoints.map((waypoint: any, index: number) => (
                        <div key={index} className="relative">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
                                {index + 1}
                              </div>
                              {index < optimizedRoute.waypoints.length - 1 && (
                                <div className="h-16 w-0.5 bg-blue-100 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {patients.find(p => p.id === waypoint.patientId)?.name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {formatTime(waypoint.estimatedTime)} Uhr
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {waypoint.visitDuration} Min Besuch
                                </div>
                                {waypoint.travelTimeToNext > 0 && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {waypoint.distanceToNext.toFixed(1)} km
                                  </div>
                                )}
                              </div>
                              {waypoint.travelTimeToNext > 0 && (
                                <div className="absolute left-11 top-[4.5rem] flex items-center gap-1 text-sm text-blue-600">
                                  <ArrowRight className="h-4 w-4" />
                                  {waypoint.travelTimeToNext} Min Fahrt
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {optimizedRoute && (
                <div className="relative rounded-lg bg-gray-100 p-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full max-h-[500px] bg-blue-50 rounded-lg border border-blue-100">
                      {/* Simulated Map */}
                      <div className="relative w-full h-full">
                        {optimizedRoute.waypoints.map((waypoint: any, index: number) => {
                          const x = (waypoint.lng - 13.3) * 1000;
                          const y = (52.6 - waypoint.lat) * 1000;

                          return (
                            <div
                              key={index}
                              className="absolute"
                              style={{
                                left: `${x}px`,
                                top: `${y}px`,
                              }}
                            >
                              <div className="w-8 h-8 -mt-4 -ml-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded text-sm shadow">
                                {waypoint.visitDuration} Min
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !selectedPatients.length || !optimizedRoute || isOptimizing}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tour wird angelegt...
                </>
              ) : isOptimizing ? (
                "Warte auf KI-Optimierung..."
              ) : (
                "Tour planen"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}