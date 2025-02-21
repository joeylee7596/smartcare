import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertTour, insertTourSchema, Patient } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Route, Brain, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { motion, AnimatePresence } from "framer-motion";

export function AddTourDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [selectedPatients, setSelectedPatients] = useState<Patient[]>([]);
  const { sendMessage, subscribe } = useWebSocket();

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
        form.setValue("optimizedRoute", message.workflow);

        toast({
          title: "Tour optimiert",
          description: `${message.workflow.waypoints.length} Patienten wurden basierend auf ihren Pflegebedürfnissen optimal eingeplant.`,
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, form, toast]);

  const optimizeRoute = async (patients: Patient[]) => {
    if (!patients.length) return;

    sendMessage({
      type: 'OPTIMIZE_TOUR',
      patients: patients,
    });

    toast({
      title: "KI plant die Tour",
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
    if (newPatients.length > 0) {
      optimizeRoute(newPatients);
    } else {
      setOptimizedRoute(null);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertTour) => {
      const res = await apiRequest("POST", "/api/tours", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour geplant",
        description: "Die Tour wurde erfolgreich angelegt.",
      });
      form.reset();
      setOptimizedRoute(null);
      setSelectedPatients([]);

      // Broadcast the update to all connected clients
      sendMessage({
        type: 'TOUR_UPDATE',
        tour: data,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Tour konnte nicht angelegt werden.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Route className="mr-2 h-4 w-4" />
          Tour planen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Neue Tour planen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid gap-6">
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

              <AnimatePresence>
                {optimizedRoute && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-100"
                  >
                    <div className="flex items-center gap-2 text-blue-700">
                      <Brain className="h-4 w-4" />
                      <p className="font-medium">KI-optimierte Tour</p>
                    </div>
                    <div className="text-sm text-blue-600">
                      <p>Geschätzte Dauer: {optimizedRoute.estimatedDuration} min</p>
                      <p>Optimierte Reihenfolge basierend auf:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>Pflegebedürfnisse der Patienten</li>
                        <li>Geografische Nähe</li>
                        <li>Bevorzugte Besuchszeiten</li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-blue-700 mb-2">Optimierte Reihenfolge:</p>
                      <div className="space-y-2">
                        {optimizedRoute.waypoints.map((waypoint: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm">
                              {index + 1}
                            </div>
                            <span className="text-sm">
                              {patients.find(p => p.id === waypoint.patientId)?.name}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={mutation.isPending || !selectedPatients.length || !optimizedRoute}
            >
              {mutation.isPending ? "Wird geplant..." : "Tour planen"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}