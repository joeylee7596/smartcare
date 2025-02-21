import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowTemplate, Tour } from "@shared/schema";
import { Brain, CheckCircle2, Clock, RotateCw, Sparkles } from "lucide-react";
import { useState } from "react";

interface SmartWorkflowProps {
  workflow: WorkflowTemplate;
  tour?: Tour;
  onOptimize: () => void;
}

export function SmartWorkflow({ workflow, tour, onOptimize }: SmartWorkflowProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setProgress(0);
    
    // Simulate AI optimization progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsOptimizing(false);
          onOptimize();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <Card className="relative overflow-hidden">
      {isOptimizing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <Brain className="h-12 w-12 text-primary animate-pulse" />
          <h3 className="mt-4 font-semibold">KI optimiert Ihren Arbeitsablauf</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Analysiere Muster und optimiere Routen...
          </p>
          <Progress value={progress} className="w-64" />
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>{workflow.name}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleOptimize}>
            <RotateCw className="mr-2 h-4 w-4" />
            Optimieren
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {workflow.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-3 rounded-lg border bg-card transition-colors hover:bg-accent/5"
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{step.action}</p>
                    {step.required && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        Erforderlich
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>~{step.duration} Min.</span>
                  </div>
                </div>
                {tour && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
