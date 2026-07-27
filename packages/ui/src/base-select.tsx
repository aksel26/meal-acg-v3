"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "../lib/utils";

const BaseSelect = SelectPrimitive.Root;

function BaseSelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="base-select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

function BaseSelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="base-select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  );
}

function BaseSelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="base-select-trigger"
      className={cn(
        "flex h-10 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground *:data-[slot=base-select-value]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function BaseSelectContent({
  className,
  children,
  onWheel,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[100]"
        style={{ pointerEvents: "auto" }}
      >
        <SelectPrimitive.Popup
          data-slot="base-select-content"
          className={cn(
            "relative isolate z-[100] w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          style={{
            maxHeight: "min(15rem, var(--available-height))",
            overflowY: "auto",
          }}
          {...props}
          onWheel={(event) => {
            onWheel?.(event);
            event.stopPropagation();
          }}
        >
          <BaseSelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <BaseSelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function BaseSelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="base-select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function BaseSelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="base-select-scroll-up-button"
      className={cn(
        "sticky top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function BaseSelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="base-select-scroll-down-button"
      className={cn(
        "sticky bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  BaseSelect,
  BaseSelectContent,
  BaseSelectGroup,
  BaseSelectItem,
  BaseSelectTrigger,
  BaseSelectValue,
};
