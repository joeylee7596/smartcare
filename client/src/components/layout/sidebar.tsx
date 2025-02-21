import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  Users,
  CalendarDays,
  ClipboardList,
  Settings,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutGrid },
  { name: "Patienten", href: "/patients", icon: Users },
  { name: "Touren", href: "/tours", icon: CalendarDays },
  { name: "Dokumentation", href: "/documentation", icon: ClipboardList },
  { name: "Einstellungen", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div
      className={cn(
        "border-r bg-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            SmartCare
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "ml-auto",
            isCollapsed && "rotate-180"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="space-y-2 p-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "sidebar" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!isCollapsed && (
                    <span className="ml-2">{item.name}</span>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
