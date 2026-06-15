"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MobileNavTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileNavProps {
  tabs: MobileNavTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  title?: string;
}

export function MobileNav({ tabs, activeTab, onTabChange, title = "Menu" }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const activeLabel = tabs.find((t) => t.value === activeTab)?.label ?? activeTab;

  return (
    <div className="md:hidden">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Menu className="h-4 w-4" />
          {activeLabel}
        </span>
        <span className="text-xs text-muted-foreground">Ganti</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.value === activeTab;
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? "default" : "outline"}
                  className="justify-start gap-3 h-12"
                  onClick={() => {
                    onTabChange(tab.value);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
