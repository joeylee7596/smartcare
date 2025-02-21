import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, LogOut } from "lucide-react";

export function Header() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-slate-950/80 dark:border-slate-800/40">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="ml-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10 transition-colors duration-300"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground animate-pulse">
              3
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-8 w-8 rounded-full hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10 transition-colors duration-300"
              >
                <Avatar className="h-8 w-8 border-2 border-primary/20 dark:border-primary/40">
                  <AvatarFallback className="bg-primary/5 text-primary dark:bg-primary/10">
                    {user?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 dark:bg-slate-900">
              <DropdownMenuItem className="flex items-center gap-2 p-3">
                <Avatar className="h-8 w-8 border border-primary/20 dark:border-primary/40">
                  <AvatarFallback className="bg-primary/5 dark:bg-primary/10">
                    {user?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()} 
                className="text-red-500 focus:text-red-500 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-500/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}