import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Home, MessageSquare, Settings, BarChart3 } from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Conexões', url: '/connections', icon: MessageSquare },
  { title: 'Relatórios', url: '/reports', icon: BarChart3 },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isExpanded = menuItems.some((item) => isActive(item.url));

  const getNavClassName = (path: string) => {
    const isItemActive = isActive(path);
    return `flex items-center w-full ${
      isItemActive 
        ? 'bg-primary text-primary-foreground shadow-neon' 
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
    } transition-all duration-200`;
  };

  return (
    <Sidebar
      className={`border-r border-border bg-card/30 backdrop-blur-sm ${
        state === 'collapsed' ? 'w-16' : 'w-64'
      }`}
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {state !== 'collapsed' && (
                        <span className="ml-3 font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};