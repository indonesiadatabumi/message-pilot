"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/services/user-service';

interface GenerateTokenFormProps {
  user: User;
  onTokenGenerated: () => void;
}

export function GenerateTokenForm({ user, onTokenGenerated }: GenerateTokenFormProps) {
  const [expiration, setExpiration] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          expiration: expiration ? new Date(expiration).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate token');
      }

      const result = await res.json();
      toast({
        title: 'Token Generated',
        description: `A new token has been created for \${result.name}.`,
      });
      
      onTokenGenerated();

    } catch (error: any) {
      console.error('Error generating token:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid items-start gap-4">
      <div className="grid gap-2">
        <Label htmlFor="tokenExpiration">Expiration Date (Optional)</Label>
        <Input
          id="tokenExpiration"
          type="datetime-local"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Generate and Save Token'}
      </Button>
    </form>
  );
}
