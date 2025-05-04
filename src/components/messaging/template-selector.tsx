"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageTemplate } from "@/services/message-service";

interface TemplateSelectorProps {
  templates: MessageTemplate[];
  selected: MessageTemplate | null;
  onSelect: (template: MessageTemplate | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TemplateSelector({
  templates,
  selected,
  onSelect,
  placeholder = "Select template...",
  disabled = false,
  className,
}: TemplateSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command>
          <CommandInput placeholder="Search templates..." />
          <CommandList>
            <CommandEmpty>No templates found.</CommandEmpty>
            <CommandGroup>
              {templates.map((template) => (
                <CommandItem
                  key={template.id}
                  value={template.name} // Searchable value
                  onSelect={() => {
                    onSelect(template);
                    setOpen(false);
                  }}
                  className="flex justify-between items-center"
                >
                   <span>{template.name}</span>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.id === template.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
