"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-xl shadow-black/30",
                "data-[state=delayed-open]:data-[side=bottom]:animate-in data-[state=delayed-open]:data-[side=left]:animate-in data-[state=delayed-open]:data-[side=right]:animate-in data-[state=delayed-open]:data-[side=top]:animate-in",
                className
            )}
            {...props}
        />
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
