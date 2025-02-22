import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertTour, insertTourSchema, Patient, Employee } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, X, Clock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AddTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedEmployeeId: number | null;
}

export function AddTourDialog({ open, onOpenChange, selectedDate, selectedEmployeeId }: AddTourDialogProps) {
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
    },
  });

  const addPatient = (patientId: string) => {
    const patient = patients.find(p => p.id.toString() === patientId);
    if (patient && !selectedPatients.find(p => p.id === patient.id)) {
      const newPatients = [...selectedPatients, patient];
      setSelectedPatients(newPatients);
      form.setValue("patientIds", newPatients.map(p => p.id));
    }
  };

  const removePatient = (patientId: number) => {
    const newPatients = selectedPatients.filter(p => p.id !== patientId);
    setSelectedPatients(newPatients);
    form.setValue("patientIds", newPatients.map(p => p.id));
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertTour) => {
      const res = await apiRequest("POST", "/api/tours", {
        ...data,
        date: data.date.toISOString()
      });
      if (!res.ok) {
        throw new Error('Failed to create tour');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour erfolgreich angelegt",
        description: "Die neue Tour wurde in den Tagesplan aufgenommen.",
      });
      form.reset();
      setSelectedPatients([]);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Tour konnte nicht angelegt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    },
  });

  const selectedEmployee = form.watch("employeeId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Neue Tour planen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            {/* Employee Selection */}
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

            {/* Patient Selection - Only show when employee is selected */}
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

                      <div className="space-y-2">
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

            <Button
              type="submit"
              disabled={!selectedEmployee || selectedPatients.length === 0 || mutation.isPending}
              className="w-full"
            >
              {mutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Tour wird angelegt...
                </>
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

export default AddTourDialog;