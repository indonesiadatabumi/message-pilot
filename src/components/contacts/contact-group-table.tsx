'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusIcon, EyeIcon, TrashIcon } from 'lucide-react';
import { AddContactGroupDialog } from './add-contact-group-dialog';
import { useState } from 'react';

interface ContactGroupTableProps {
  groups: { id: string; name: string }[]; // Assuming groups have an id and name
}

const ContactGroupTable: React.FC<ContactGroupTableProps> = ({ groups }) => {
  // Placeholder functions for handling group actions
  const handleViewContacts = (groupId: string) => {
    console.log('View contacts for group:', groupId);
    // Implement logic to view contacts in the group
  };

  const handleDeleteGroup = (groupId: string) => {
    console.log('Delete group:', groupId);
    // Implement logic to delete the group
  };

  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);

  const handleAddGroup = () => {
    setIsAddGroupDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddGroup}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </div>      <div className="rounded-md border">        <Table>          <TableHeader>
            <TableRow>
              <TableHead>Group Name</TableHead><TableHead>
                Contacts
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length > 0 ? (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    {/* Display number of contacts or a list */}
                  </TableCell>
                  <TableCell className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewContacts(group.id)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No groups found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AddContactGroupDialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen} />
    </div>
  );
};

export default ContactGroupTable;