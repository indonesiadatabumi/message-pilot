"use client";

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { GenerateTokenDialog } from "./generate-token-dialog"; // Import the new dialog
import type { User } from '@/services/user-service'; // Assuming this type export exists

interface UserTableProps {
  users: User[];
  onUserUpdated: () => void; // Callback to refresh data
}

export const UserTable = ({ users, onUserUpdated }: UserTableProps) => {
    const { toast } = useToast();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

    const openTokenDialog = (user: User) => {
        if (user.role !== 'admin') {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: 'Tokens can only be generated for admin users.',
            });
            return;
        }
        setSelectedUser(user);
        setIsTokenDialogOpen(true);
    };

    const columns: ColumnDef<User>[] = [
        {
          accessorKey: "name",
          header: "Name",
        },
        {
          accessorKey: "email",
          header: "Email",
        },
        {
          accessorKey: "role",
          header: "Role",
        },
        {
          accessorKey: "adminToken",
          header: "Admin Token",
          cell: ({ row }) => {
            const token = row.original.adminToken;
            return token ? `...${token.slice(-6)}` : "N/A";
          }
        },
        {
          id: "actions",
          cell: ({ row }) => {
            const user = row.original;
      
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                    Copy User ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => openTokenDialog(user)}>
                    Generate Token
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Edit User (TBD)</DropdownMenuItem>
                  <DropdownMenuItem disabled>Delete User (TBD)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <GenerateTokenDialog 
        user={selectedUser}
        open={isTokenDialogOpen}
        onOpenChange={setIsTokenDialogOpen}
        onTokenGenerated={() => {
            onUserUpdated(); // Refresh the user list
        }}
      />
    </>
  );
};
