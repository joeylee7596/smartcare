import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  Settings as SettingsIcon,
  Bell,
  Palette,
  Globe,
  Brain,
  Route,
  FileText,
  Key,
  Clock,
  Building2
} from "lucide-react";

// Schema für allgemeine Einstellungen
const generalSettingsSchema = z.object({
  language: z.string(),
  timezone: z.string(),
  theme: z.string(),
  enableNotifications: z.boolean(),
});

// Schema für Dokumentationseinstellungen
const documentationSettingsSchema = z.object({
  enableAI: z.boolean(),
  autoSuggest: z.boolean(),
  reviewRequired: z.boolean(),
  templateLanguage: z.string(),
});

// Schema für API-Einstellungen
const apiSettingsSchema = z.object({
  geminiApiKey: z.string().optional(),
  enableAnalytics: z.boolean(),
});

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form für allgemeine Einstellungen
  const generalForm = useForm({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      language: "de",
      timezone: "Europe/Berlin",
      theme: "system",
      enableNotifications: true,
    },
  });

  // Form für Dokumentationseinstellungen
  const documentationForm = useForm({
    resolver: zodResolver(documentationSettingsSchema),
    defaultValues: {
      enableAI: true,
      autoSuggest: true,
      reviewRequired: true,
      templateLanguage: "de",
    },
  });

  // Form für API-Einstellungen
  const apiForm = useForm({
    resolver: zodResolver(apiSettingsSchema),
    defaultValues: {
      geminiApiKey: "",
      enableAnalytics: true,
    },
  });

  // Mock-Daten für Benutzer
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Mock-Mutation für Einstellungsaktualisierung
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Einstellungen aktualisiert",
        description: "Ihre Änderungen wurden erfolgreich gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Einstellungen
            </h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Anwendungseinstellungen und Konfigurationen
            </p>
          </div>

          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <TabsTrigger value="general" className="text-left flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Allgemein
              </TabsTrigger>
              <TabsTrigger value="documentation" className="text-left flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dokumentation
              </TabsTrigger>
              <TabsTrigger value="users" className="text-left flex items-center gap-2">
                <Users className="h-4 w-4" />
                Benutzer
              </TabsTrigger>
              <TabsTrigger value="api" className="text-left flex items-center gap-2">
                <Key className="h-4 w-4" />
                API & Integration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Allgemeine Einstellungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...generalForm}>
                    <form onSubmit={generalForm.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={generalForm.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sprache</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sprache auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generalForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zeitzone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Zeitzone auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                                <SelectItem value="Europe/London">London</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generalForm.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Design</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Design auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="light">Hell</SelectItem>
                                <SelectItem value="dark">Dunkel</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generalForm.control}
                        name="enableNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Benachrichtigungen</FormLabel>
                              <FormDescription>
                                Erhalten Sie Echtzeit-Updates über wichtige Ereignisse
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">Speichern</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentation">
              <Card>
                <CardHeader>
                  <CardTitle>Dokumentationseinstellungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...documentationForm}>
                    <form onSubmit={documentationForm.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={documentationForm.control}
                        name="enableAI"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>KI-Unterstützung</FormLabel>
                              <FormDescription>
                                Aktivieren Sie die KI-gestützte Dokumentationsunterstützung
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={documentationForm.control}
                        name="autoSuggest"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Automatische Vorschläge</FormLabel>
                              <FormDescription>
                                Erhalten Sie kontextbezogene Vorschläge während der Dokumentation
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={documentationForm.control}
                        name="reviewRequired"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Überprüfung erforderlich</FormLabel>
                              <FormDescription>
                                KI-generierte Dokumente müssen manuell überprüft werden
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={documentationForm.control}
                        name="templateLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vorlagensprache</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sprache auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">Speichern</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Benutzerverwaltung</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="p-4 space-y-4">
                      {employees.map((employee: any) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">{employee.name}</h3>
                              <p className="text-sm text-gray-500">{employee.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{employee.role}</Badge>
                            <Button variant="ghost" size="sm">Bearbeiten</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API & Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...apiForm}>
                    <form onSubmit={apiForm.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={apiForm.control}
                        name="geminiApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google Gemini API-Schlüssel</FormLabel>
                            <FormDescription>
                              Erforderlich für KI-gestützte Funktionen
                            </FormDescription>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={apiForm.control}
                        name="enableAnalytics"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Nutzungsanalyse</FormLabel>
                              <FormDescription>
                                Hilft uns, die Anwendung zu verbessern
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">Speichern</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
