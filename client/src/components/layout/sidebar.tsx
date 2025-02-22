import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  House,
  UsersThree,
  Path,
  ClipboardText,
  Gear,
  CaretLeft,
  Calendar,
} from "phosphor-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { name: "Dashboard", href: "/", icon: House },
  { name: "Patienten", href: "/patients", icon: UsersThree },
  { name: "Touren", href: "/tours", icon: Path },
  { name: "Dokumentation", href: "/documentation", icon: ClipboardText },
  { name: "Dienstplan", href: "/schedule", icon: Calendar },
];

const secondaryNavigation = [
  { name: "Einstellungen", href: "/settings", icon: Gear },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[#1E2A4A] relative",
        "shadow-[8px_0_30px_-12px_rgba(0,0,0,0.45)]",
        "transition-all duration-500 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Clean top-right corner with single gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E2A4A] via-[#111827] to-[#1F2937]" />

      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Right edge with perfect corner */}
      <div className="absolute top-0 right-0 h-16 w-16 bg-[#1E2A4A] rounded-tr-2xl" />

      {/* Content container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex h-16 items-center px-4">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-white/90 transition-opacity duration-500">
              SmartCare
            </h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "ml-auto text-white/70 hover:text-white hover:bg-white/5 transition-all duration-500",
              "hover:scale-105 active:scale-95",
              isCollapsed && "rotate-180"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <CaretLeft weight="bold" className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-6 py-3">
            <div className="px-2">
              <h3 className={cn(
                "mb-2 text-xs uppercase text-white/50 tracking-wider font-medium transition-opacity duration-500",
                isCollapsed && "sr-only"
              )}>
                Navigation
              </h3>
              <div className="space-y-1">
                {primaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "sidebar" : "ghost"}
                        className={cn(
                          "w-full justify-start text-white/70 hover:text-white transition-all duration-300 relative group overflow-hidden",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          isActive
                            ? "bg-white/10 text-white shadow-lg shadow-blue-500/10 border border-white/5"
                            : "hover:bg-white/5 hover:shadow-lg hover:shadow-blue-500/5",
                          isCollapsed ? "justify-center p-2" : "px-3 py-2.5"
                        )}
                      >
                        <Icon
                          weight={isActive ? "fill" : "regular"}
                          className={cn(
                            "transition-all duration-300",
                            isCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3",
                            "group-hover:scale-110 group-hover:rotate-3"
                          )}
                        />
                        {!isCollapsed && (
                          <span className="transition-opacity duration-500">{item.name}</span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="px-2">
              <h3 className={cn(
                "mb-2 text-xs uppercase text-white/50 tracking-wider font-medium transition-opacity duration-500",
                isCollapsed && "sr-only"
              )}>
                System
              </h3>
              <div className="space-y-1">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "sidebar" : "ghost"}
                        className={cn(
                          "w-full justify-start text-white/70 hover:text-white transition-all duration-300 relative group overflow-hidden",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          isActive
                            ? "bg-white/10 text-white shadow-lg shadow-blue-500/10 border border-white/5"
                            : "hover:bg-white/5 hover:shadow-lg hover:shadow-blue-500/5",
                          isCollapsed ? "justify-center p-2" : "px-3 py-2.5"
                        )}
                      >
                        <Icon
                          weight={isActive ? "fill" : "regular"}
                          className={cn(
                            "transition-all duration-300",
                            isCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3",
                            "group-hover:scale-110 group-hover:rotate-3"
                          )}
                        />
                        {!isCollapsed && (
                          <span className="transition-opacity duration-500">{item.name}</span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}