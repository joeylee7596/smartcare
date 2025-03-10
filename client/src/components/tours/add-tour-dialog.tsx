import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertTour, insertTourSchema, Patient, Employee } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, X, Clock, Euro, Calculator, PhoneCall } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AddTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedEmployeeId: number | null;
  tourToEdit?: InsertTour & { id: number };
}

export default function AddTourDialog({ 
  open, 
  onOpenChange, 
  selectedDate, 
  selectedEmployeeId,
  tourToEdit 
}: AddTourDialogProps) {
  const { toast } = useToast();
  const [selectedPatients, setSelectedPatients] = useState<Patient[]>([]);
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<InsertTour>({
    resolver: zodResolver(insertTourSchema),
    defaultValues: {
      employeeId: selectedEmployeeId || undefined,
      patientIds: [],
      date: selectedDate,
      status: "scheduled",
      economicIndicator: "yellow",
      economicCalculation: {
        personnelCosts: 0,
        vehicleCosts: 0,
        specialServiceFees: 0,
        totalCosts: 0,
        expectedRevenue: 0,
        profitMargin: 0
      },
      mobileDocumentation: {
        offlineCapable: true,
        gpsTracking: true,
        signatureRequired: true
      }
    },
  });

  // Load tour data when editing
  useEffect(() => {
    if (tourToEdit) {
      form.reset(tourToEdit);
      const tourPatients = patients.filter(p => tourToEdit.patientIds.includes(p.id));
      setSelectedPatients(tourPatients);
    }
  }, [tourToEdit, patients, form]);

  const addPatient = (patientId: string) => {
    const patient = patients.find(p => p.id.toString() === patientId);
    if (patient && !selectedPatients.find(p => p.id === patient.id)) {
      const newPatients = [...selectedPatients, patient];
      setSelectedPatients(newPatients);
      form.setValue("patientIds", newPatients.map(p => p.id));

      const personnelCosts = newPatients.length * 45;
      const vehicleCosts = calculateVehicleCosts(newPatients);
      const specialServiceFees = calculateSpecialServiceFees(newPatients);
      const totalCosts = personnelCosts + vehicleCosts + specialServiceFees;
      const expectedRevenue = calculateExpectedRevenue(newPatients);
      const profitMargin = ((expectedRevenue - totalCosts) / totalCosts) * 100;

      const newEconomicCalculation = {
        personnelCosts,
        vehicleCosts,
        specialServiceFees,
        totalCosts,
        expectedRevenue,
        profitMargin
      };

      form.setValue("economicCalculation", newEconomicCalculation);
      form.setValue("economicIndicator", profitMargin >= 20 ? "green" : profitMargin >= 10 ? "yellow" : "red");
    }
  };

  const removePatient = (patientId: number) => {
    const newPatients = selectedPatients.filter(p => p.id !== patientId);
    setSelectedPatients(newPatients);
    form.setValue("patientIds", newPatients.map(p => p.id));

    if (newPatients.length === 0) {
      const defaultEconomicCalculation = {
        personnelCosts: 0,
        vehicleCosts: 0,
        specialServiceFees: 0,
        totalCosts: 0,
        expectedRevenue: 0,
        profitMargin: 0
      };
      form.setValue("economicCalculation", defaultEconomicCalculation);
      form.setValue("economicIndicator", "yellow");
    } else {
      addPatient(newPatients[newPatients.length - 1].id.toString());
    }
  };

  const calculateVehicleCosts = (patients: Patient[]): number => {
    return patients.length * 15;
  };

  const calculateSpecialServiceFees = (patients: Patient[]): number => {
    return patients.reduce((total, patient) => total + (patient.careLevel * 10), 0);
  };

  const calculateExpectedRevenue = (patients: Patient[]): number => {
    return patients.reduce((total, patient) => total + 60 + (patient.careLevel * 15), 0);
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertTour) => {
      const res = await apiRequest(
        tourToEdit ? "PATCH" : "POST",
        tourToEdit ? `/api/tours/${tourToEdit.id}` : "/api/tours",
        {
          ...data,
          date: data.date.toISOString()
        }
      );
      if (!res.ok) {
        throw new Error('Failed to save tour');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: tourToEdit ? "Tour aktualisiert" : "Tour erfolgreich angelegt",
        description: tourToEdit 
          ? "Die Änderungen wurden gespeichert."
          : "Die neue Tour wurde in den Tagesplan aufgenommen.",
      });
      form.reset();
      setSelectedPatients([]);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: `Die Tour konnte nicht ${tourToEdit ? 'aktualisiert' : 'angelegt'} werden. Bitte versuchen Sie es erneut.`,
        variant: "destructive",
      });
    },
  });

  const selectedEmployee = form.watch("employeeId");
  const economicCalculation = form.watch("economicCalculation") || {
    personnelCosts: 0,
    vehicleCosts: 0,
    specialServiceFees: 0,
    totalCosts: 0,
    expectedRevenue: 0,
    profitMargin: 0
  };
  const mobileDocumentation = form.watch("mobileDocumentation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{tourToEdit ? 'Tour bearbeiten' : 'Neue Tour planen'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mitarbeiter auswählen</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mitarbeiter auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.name}
                            {employee.qualifications.nursingDegree && " (Examiniert)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {selectedEmployee && (
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
                                  {" - Pflegegrad " + patient.careLevel}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                          <AnimatePresence>
                            {selectedPatients.map((patient) => (
                              <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-accent"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <span className="font-medium">{patient.name}</span>
                                    <span className="ml-2 text-sm text-muted-foreground">
                                      Pflegegrad {patient.careLevel}
                                    </span>
                                  </div>
                                </div>
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
              )}

              {selectedPatients.length > 0 && (
                <div className="space-y-4 p-4 rounded-lg border bg-accent/5">
                  <h3 className="font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Wirtschaftlichkeitsberechnung
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Personalkosten</p>
                      <p className="font-medium">{economicCalculation.personnelCosts.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fahrzeugkosten</p>
                      <p className="font-medium">{economicCalculation.vehicleCosts.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Erwarteter Umsatz</p>
                      <p className="font-medium">{economicCalculation.expectedRevenue.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gewinnmarge</p>
                      <p className={cn(
                        "font-medium",
                        economicCalculation.profitMargin >= 20 ? "text-green-600" :
                          economicCalculation.profitMargin >= 10 ? "text-amber-600" : "text-red-600"
                      )}>
                        {economicCalculation.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 p-4 rounded-lg border bg-accent/5">
                <h3 className="font-medium flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-primary" />
                  Mobile Dokumentation
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="mobileDocumentation.offlineCapable"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Offline-Modus</FormLabel>
                          <FormDescription>
                            Ermöglicht die Dokumentation ohne Internetverbindung
                          </FormDescription>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobileDocumentation.gpsTracking"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>GPS-Tracking</FormLabel>
                          <FormDescription>
                            Erfasst automatisch die Position bei Leistungserbringung
                          </FormDescription>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobileDocumentation.signatureRequired"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Unterschrift erforderlich</FormLabel>
                          <FormDescription>
                            Fordert eine digitale Unterschrift des Patienten an
                          </FormDescription>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <div className="pt-4 border-t">
          <Button
            type="submit"
            onClick={form.handleSubmit((data) => mutation.mutate(data))}
            disabled={!selectedEmployee || selectedPatients.length === 0 || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                {tourToEdit ? 'Änderungen werden gespeichert...' : 'Tour wird angelegt...'}
              </>
            ) : (
              tourToEdit ? 'Änderungen speichern' : 'Tour planen'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}