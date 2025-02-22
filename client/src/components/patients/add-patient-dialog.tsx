import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertPatient, insertPatientSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Camera, FileText, Loader2, Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";

export function AddPatientDialog() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      medications: [],
      aiSummary: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient hinzugefügt",
        description: "Der Patient wurde erfolgreich angelegt.",
      });
      form.reset();
      setPreviewImage(null);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Patient konnte nicht angelegt werden.",
        variant: "destructive",
      });
    },
  });

  const extractDataMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await apiRequest("POST", "/api/ai/extract-patient-data", {
        documentImage: imageData
      });

      if (!response.ok) {
        throw new Error("Fehler bei der Dokumentenanalyse");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Update form with extracted data
        Object.entries(data.data).forEach(([key, value]) => {
          form.setValue(key as keyof InsertPatient, value);
        });

        toast({
          title: "Daten extrahiert",
          description: "Die Patientendaten wurden erfolgreich aus dem Dokument extrahiert.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Dokumentenanalyse fehlgeschlagen. Bitte füllen Sie die Daten manuell aus.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ungültiges Format",
        description: "Bitte laden Sie ein Bild hoch (JPG, PNG).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setPreviewImage(imageData);

        // Extract data using AI
        await extractDataMutation.mutateAsync(imageData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Dokument konnte nicht verarbeitet werden.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Patient hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Neuen Patienten anlegen</DialogTitle>
        </DialogHeader>

        {/* Document Upload Section */}
        <div className="mb-6">
          <Card className="p-4 text-center">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />
            {previewImage ? (
              <div className="space-y-4">
                <img
                  src={previewImage}
                  alt="Dokumentenvorschau"
                  className="max-h-[200px] mx-auto rounded-lg object-contain"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || extractDataMutation.isPending}
                  className="w-full"
                >
                  {isProcessing || extractDataMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verarbeite Dokument...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Anderes Dokument scannen
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Dokument hochladen</span>
                  <span className="text-sm text-muted-foreground">
                    Klicken Sie hier oder ziehen Sie ein Dokument hierher
                  </span>
                </div>
              </Button>
            )}
          </Card>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="careLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pflegegrad</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="5" 
                      {...field} 
                      onChange={e => field.onChange(parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notfallkontakt</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Krankenkasse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versicherungsnummer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wichtige Hinweise</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || isProcessing}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird angelegt...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Patient anlegen
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}