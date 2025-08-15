import { RegisterUserForm } from '@/components/admin/register-user-form';
import { UserTable } from '@/components/admin/user-table'; // Placeholder - needs creation
import { getUsers } from '@/actions/user-actions'; // Import the real action
import { GenerateTokenForm } from '@/components/admin/generate-token-form';
import type { User } from '@/services/user-service'; // Placeholder - needs creation

export default async function ManageUsersPage() {

    // Fetch existing users from the database
    const users: User[] = await getUsers();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2 text-foreground">User Management</h1>
                <p className="text-muted-foreground">Register new users and manage existing accounts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <h2 className="text-xl font-semibold mb-4">Register New User</h2>
                    <RegisterUserForm />
                </div>

                <div className="md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Existing Users</h2>
                    {/* UserTable will display the users fetched from DB */}
                    <UserTable users={users} />
                </div>

                <div className="md:col-span-3">
                    <h2 className="text-xl font-semibold mb-4">Generate Admin Token</h2>
                    <GenerateTokenForm />
                </div>
            </div>
        </div>
    );
}
