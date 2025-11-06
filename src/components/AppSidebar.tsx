import { NavLink } from "react-router-dom";
import { Settings, Calendar, Gavel, LayoutDashboard, LogOut, Users, Award } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Judge Panel", url: "/judge-access", icon: Gavel },
  { title: "My Events", url: "/my-events", icon: Calendar },
  { title: "Certificates", url: "/certificates", icon: Award },
  { title: "Networking", url: "/networking", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  userRoles: string[];
}

export function AppSidebar({ userRoles }: AppSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-muted text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </Sidebar>
  );
}
