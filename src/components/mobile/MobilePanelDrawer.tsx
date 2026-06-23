import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Altura máxima do drawer (ex.: 85vh para painéis grandes). */
  maxHeight?: string;
};

export function MobilePanelDrawer({
  open,
  onOpenChange,
  title,
  children,
  maxHeight = "75vh",
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="md:hidden"
        style={{ maxHeight }}
      >
        <DrawerHeader className="border-b pb-3 text-left">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
