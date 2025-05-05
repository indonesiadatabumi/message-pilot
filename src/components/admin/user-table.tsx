"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // For admin status
import { Edit, Trash2, ShieldCheck, User as UserIcon } from "lucide-react"; // Icons
import type { User } from "@/services/user-service"; // Placeholder - needs creation
import { format } from "date-fns"; // For date formatting
// Placeholder for Edit/Delete Modals/Alerts
// import { EditUserDialog } from "./edit-user-dialog";
// import { DeleteUserAlert } from "./delete-user-alert";

interface UserTableProps {
    users: User[];
}

export function UserTable({ users: initialUsers }: UserTableProps) {
    // const router = useRouter(); // If needed for refresh
    const [users, setUsers] = React.useState(initialUsers);
    // State for modals when implemented
    // const [editingUser, setEditingUser] = React.useState<User | null>(null);
    // const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
    // const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    // Update local state if initial props change
    React.useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    // Handlers for edit/delete actions (placeholders)
    const handleEditClick = (user: User) => {
        console.log("Edit user:", user.username);
        // setEditingUser(user); setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        console.log("Delete user:", user.username);
        // setDeletingUser(user); setIsDeleteDialogOpen(true);
    };

    // Callbacks for modal success (placeholders)
    // const handleEditSuccess = (updatedUser: User) => { ... };
    // const handleDeleteSuccess = () => { ... };

    // Callbacks for modal close (placeholders)
    // const handleEditClose = () => { ... };
    // const handleDeleteClose = () => { ... };


    return (
        <>
            <div className="rounded-md border shadow-sm bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user._id?.toString()}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>
                                        {user.isAdmin ? (
                                            <Badge variant="destructive" className="flex items-center w-fit">
                                                <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="flex items-center w-fit">
                                                <UserIcon className="mr-1 h-3 w-3" /> User
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{format(new Date(user.createdAt), "PPP")}</TableCell> {/* Format date */}
                                    <TableCell className="text-right">
                                        {/* Edit Button (Placeholder) */}
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)} aria-label="Edit User" disabled>
                                            <Edit className="h-4 w-4 opacity-50" />
                                        </Button>
                                        {/* Delete Button (Placeholder) */}
                                        {/* Prevent deleting the main admin for safety in this mock */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteClick(user)}
                                            className="text-destructive hover:text-destructive/90"
                                            aria-label="Delete User"
                                            disabled={user.username === 'admin'}
                                            title={user.username === 'admin' ? 'Cannot delete main admin' : 'Delete User'}
                                        >
                                            <Trash2 className={`h-4 w-4 ${user.username === 'admin' ? 'opacity-50' : ''}`} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Placeholder Modals */}
            {/* <EditUserDialog user={editingUser} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onSaveSuccess={handleEditSuccess} /> */}
            {/* <DeleteUserAlert user={deletingUser} open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirmDelete={handleDeleteSuccess} /> */}
        </>
    );
}
