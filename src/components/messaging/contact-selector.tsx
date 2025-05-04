"use client";

import * as React from "react";
import { Check, ChevronsUpDown, XIcon } from "lucide-react"; // Ensure XIcon is imported or defined

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"; // Adjusted import path if corrected previously
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/services/message-service"; // Use type import

interface ContactSelectorProps {
  contacts: Contact[];
  selected: Contact | Contact[] | null;
  onSelect: (selected: Contact | Contact[] | null) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ContactSelector({
  contacts,
  selected,
  onSelect,
  placeholder = "Select contact...",
  multiple = false,
  disabled = false,
  className,
}: ContactSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (contact: Contact) => {
    if (multiple) {
      const currentSelected = Array.isArray(selected) ? selected : [];
      // Use _id for comparison
      const index = currentSelected.findIndex((c) => c._id === contact._id);
      let newSelected: Contact[];
      if (index > -1) {
        // Deselect
        newSelected = currentSelected.filter((_, i) => i !== index);
      } else {
        // Select
        newSelected = [...currentSelected, contact];
      }
      onSelect(newSelected.length > 0 ? newSelected : null);
    } else {
      onSelect(contact);
      setOpen(false); // Close popover on single select
    }
  };

  const getTriggerText = () => {
    if (multiple) {
      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        return placeholder;
      }
      const count = Array.isArray(selected) ? selected.length : 0;
      return `${count} contact${count !== 1 ? 's' : ''} selected`;
    } else {
      // Display name for single select
      return selected && !Array.isArray(selected) ? selected.name : placeholder;
    }
  };

  const selectedValues = React.useMemo(() => {
     // Use _id for the Set keys
    if (multiple && Array.isArray(selected)) {
      return new Set(selected.map(c => c._id?.toString()));
    }
    if (!multiple && selected && !Array.isArray(selected)) {
       return new Set([selected._id?.toString()]);
    }
    return new Set<string | undefined>();
  }, [selected, multiple]);


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
            {getTriggerText()}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              {contacts.map((contact) => (
                <CommandItem
                  // Use _id as key
                  key={contact._id?.toString()}
                  // Use name and phone for search value
                  value={`${contact.name} ${contact.phone}`}
                  onSelect={() => handleSelect(contact)}
                  className="flex justify-between items-center"
                >
                   {/* Display name and phone */}
                   <span>{contact.name} ({contact.phone})</span>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      // Check against stringified _id in the Set
                      selectedValues.has(contact._id?.toString()) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
         {multiple && Array.isArray(selected) && selected.length > 0 && (
            <div className="p-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Selected:</p>
                <div className="flex flex-wrap gap-1">
                    {selected.map(contact => (
                        // Use _id as key for badge
                        <Badge key={contact._id?.toString()} variant="secondary" className="flex items-center gap-1">
                            {contact.name}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent popover close
                                    handleSelect(contact); // Deselect
                                }}
                                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                aria-label={`Remove ${contact.name}`}
                            >
                                <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


// Minimal XIcon if not imported from lucide-react (if it exists there)
// function XIcon(props: React.SVGProps<SVGSVGElement>) {
//   return (
//     <svg
//       {...props}
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M18 6 6 18" />
//       <path d="m6 6 12 12" />
//     </svg>
//   )
// }
