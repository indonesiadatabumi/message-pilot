"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { createContactGroup } from "@/actions/contact-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Contact } from "@/types/contact"; // Assuming you have a Contact type

interface AddContactGroupDialogProps {
  contacts?: Contact[]; // Pass available contacts to select from, make it optional
}

export function AddContactGroupDialog({ contacts }: AddContactGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]); // Store IDs of selected contacts

  const handleAddGroup = async () => {
    const result = await createContactGroup({ name: groupName, contactIds: selectedContacts });

 if (result.success) {
      toast({
        title: "Group Added",
        description: `Contact group "${groupName}" has been created.`,
      });
      setGroupName(""); // Reset form
      setSelectedContacts([]);
      setIsOpen(false);
    } else {
      toast({
        title: "Error Adding Group",
        description: result.error || "An unknown error occurred.",
        variant: "destructive",
      });
      if (result.fieldErrors) {
        // Optionally handle and display field-specific errors
        console.error("Field errors:", result.fieldErrors);
      }
    }
  };

  const handleContactSelect = (contactId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts.filter((id) => id !== contactId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Group</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Contact Group</DialogTitle>
          <DialogDescription>
            Create a new group for organizing your contacts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="groupName" className="text-right">
              Group Name
            </Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="contacts" className="text-right">
              Select Contacts
            </Label>
            <div className="col-span-3 max-h-40 overflow-y-auto border rounded p-2">
              {(contacts || []).map((contact) => ( // Add a check for contacts being undefined
                <div key={contact._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={contact._id}
                    checked={selectedContacts.includes(contact._id)}
                    onCheckedChange={(isChecked) =>
                      handleContactSelect(contact._id, isChecked as boolean)
                    }
                  />
                  <label


                    htmlFor={contact._id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {contact.name || contact.phone}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleAddGroup}>
            Add Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}