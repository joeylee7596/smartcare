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
import { useState } from "react";

export function AddTourDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState<number[]>([]);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const form = useForm<InsertTour>({
    resolver: zodResolver(insertTourSchema),
    defaultValues: {
      caregiverId: user?.id,
      patientIds: [],
      status: "scheduled",
      date: new Date().toISOString(),
    },
  });

  // Simulated route optimization
  const optimizeRoute = async (patientIds: number[]) => {
    if (!patientIds.length) return;

    const selectedPatients = patients.filter(p => patientIds.includes(p.id));

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate simulated coordinates around Dresden
    const baseCoords = { lat: 51.0504, lng: 13.7373 }; // Dresden coordinates
    const waypoints = selectedPatients.map((patient, index) => ({
      lat: baseCoords.lat + (Math.random() - 0.5) * 0.1,
      lng: baseCoords.lng + (Math.random() - 0.5) * 0.1,
      patientId: patient.id
    }));

    // Simulate route optimization
    const route = {
      waypoints,
      totalDistance: Number((Math.random() * 15 + 5).toFixed(1)), // 5-20 km
      estimatedDuration: Math.round(Math.random() * 60 + 30), // 30-90 minutes
    };

    setOptimizedRoute(route);
    form.setValue("optimizedRoute", route);

    toast({
      title: "Route optimiert",
      description: `${waypoints.length} Stationen in optimaler Reihenfolge geplant.`,
    });
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertTour) => {
      const res = await apiRequest("POST", "/api/tours", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour geplant",
        description: "Die Tour wurde erfolgreich angelegt.",
      });
      form.reset();
      setOptimizedRoute(null);
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
                        <Input type="datetime-local" {...field} />
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
                {optimizedRoute && (
                  <div className="space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Brain className="h-4 w-4" />
                      <p className="font-medium">KI-Optimierte Route</p>
                    </div>
                    <div className="text-sm text-blue-600">
                      <p>Gesamtdistanz: {optimizedRoute.totalDistance} km</p>
                      <p>Geschätzte Dauer: {optimizedRoute.estimatedDuration} min</p>
                      <p>Stationen: {optimizedRoute.waypoints.length}</p>
                    </div>
                  </div>
                )}
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
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Wird geplant..." : "Tour planen"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}