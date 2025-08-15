      "use client";
      
      import { ApiKeyForm } from '@/components/admin/api-key-form';
      import { ApiKeyTable } from '@/components/admin/api-key-table';
      import { Separator } from '@/components/ui/separator';
      import { useEffect, useState, useCallback } from 'react';
      
      // Define the shape of the API Key object
      interface ApiKey {
        _id: string;
        name: string;
        key: string;
        expiration: string | null;
        createdAt: string;
      }
      
      export default function ApiKeysPage() {
        const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
        const [loading, setLoading] = useState(true);
      
        // Use useCallback to memoize the fetch function
        const fetchApiKeys = useCallback(async () => {
          setLoading(true);
          try {
            const res = await fetch('/api/get-api-keys');
            if (!res.ok) {
              throw new Error('Failed to fetch API keys');
            }
            const data = await res.json();
            setApiKeys(data);
          } catch (error) {
            console.error('Error fetching API keys:', error);
            // In a real app, you'd show a toast or an error message here
            setApiKeys([]); // Clear keys on error
          } finally {
            setLoading(false);
          }
        }, []);
      
        // Fetch keys on initial mount
        useEffect(() => {
          fetchApiKeys();
        }, [fetchApiKeys]);
      
        return (
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">API Key Management</h2>
            </div>
            <p className="text-muted-foreground">
                Generate and manage API keys for third-party application access.
            </p>
            <Separator />
      
            {/* API Key Generation Form */}
            <ApiKeyForm onKeyGenerated={fetchApiKeys} />
      
            <Separator className="my-6" />
      
            {/* API Key Table */}
            <div className="space-y-4">
                <h3 className="text-xl font-medium">Existing API Keys</h3>
                {loading ? (
                <div>Loading API Keys...</div>
                ) : (
                <ApiKeyTable apiKeys={apiKeys} onKeyRevoked={fetchApiKeys} />
                )}
            </div>
          </div>
        );
      }
      