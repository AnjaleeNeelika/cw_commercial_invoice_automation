"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, History, LayoutDashboard, UploadCloud } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Upload invoice", icon: UploadCloud, href: "/invoice-upload" },
  { label: "Processing history", icon: History, href: "/history" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <ShadcnSidebar collapsible="icon" className="bg-sidebar">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">InvoiceFlow</p>
            <p className="truncate text-[11px] text-sidebar-foreground/65">Operations workspace</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(({ label, icon: Icon, href }) => {
                const active = pathname === href;

                return (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton asChild isActive={active} tooltip={label}>
                    <Link href={href} aria-current={active ? "page" : undefined}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-2 text-sidebar-accent-foreground">
          <Avatar size="sm">
            <AvatarFallback>AM</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">Admin workspace</p>
            <p className="truncate text-xs text-sidebar-foreground/65">Commercial operations</p>
          </div>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
