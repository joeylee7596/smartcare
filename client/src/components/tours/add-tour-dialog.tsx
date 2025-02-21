import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertTour, insertTourSchema, Patient } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Route, Brain } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { motion, AnimatePresence } from "framer-motion";

export function AddTourDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [selectedPatients, setSelectedPatients] = useState<number[]>([]);
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
      date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    },
  });

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'OPTIMIZED_TOUR') {
        setOptimizedRoute(message.workflow);
        form.setValue("optimizedRoute", message.workflow);

        toast({
          title: "Route optimiert",
          description: `${message.workflow.waypoints.length} Stationen in optimaler Reihenfolge geplant.`,
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, form, toast]);

  const optimizeRoute = async (patientIds: number[]) => {
    if (!patientIds.length) return;

    const selectedPatients = patients.filter(p => patientIds.includes(p.id));
    sendMessage({
      type: 'OPTIMIZE_TOUR',
      patients: selectedPatients,
    });

    toast({
      title: "Route wird optimiert",
      description: "KI berechnet die optimale Route...",
    });
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
          Tour erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Neue Tour planen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum & Uhrzeit</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="patientIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patienten</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const ids = value.split(",").map(Number);
                          field.onChange(ids);
                          setSelectedPatients(ids);
                          optimizeRoute(ids);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Patienten auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <p className="font-medium">KI-Optimierte Route</p>
                      </div>
                      <div className="text-sm text-blue-600">
                        <p>Gesamtdistanz: {optimizedRoute.totalDistance.toFixed(1)} km</p>
                        <p>Geschätzte Dauer: {optimizedRoute.estimatedDuration} min</p>
                        <p>Stationen: {optimizedRoute.waypoints.length}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative h-[300px] rounded-lg bg-blue-50 border border-blue-100 p-4">
                <div className="text-center text-blue-600">
                  <Brain className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Tourenvisualisierung</p>
                  <p className="text-sm mt-1">
                    {optimizedRoute 
                      ? `${optimizedRoute.waypoints.length} Stationen optimiert`
                      : "Wählen Sie Patienten aus, um die Route zu optimieren"}
                  </p>
                  {optimizedRoute && (
                    <motion.div 
                      className="mt-4 space-y-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {optimizedRoute.waypoints.map((waypoint: any, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-2 justify-center"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm">
                            {index + 1}
                          </div>
                          <span className="text-sm">
                            {patients.find(p => p.id === waypoint.patientId)?.name}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={mutation.isPending || !selectedPatients.length}
            >
              {mutation.isPending ? "Wird geplant..." : "Tour planen"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}