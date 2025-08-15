"use client";

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyFormProps {
  onKeyGenerated: () => void;
}

export function ApiKeyForm({ onKeyGenerated }: ApiKeyFormProps) {
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedToken(null); // Clear previous token

    try {
      const res = await fetch('/api/generate-jwt-key', { // Use the new JWT endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          expiration: expiration ? new Date(expiration).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate JWT key');
      }

      const result = await res.json();
      setGeneratedToken(result.token); // Store the token to display it
      toast({
        title: 'JWT API Key Generated',
        description: `A new key named "${result.name}" has been created. Copy it now, as you won't be able to see it again.`,
      });

      // Reset form and refresh the table
      setName('');
      setExpiration('');
      onKeyGenerated();
    } catch (error: any) {
      console.error('Error generating API key:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Copied to Clipboard",
      description: "The generated JWT has been copied.",
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">Generate New JWT API Key</h3>
        <div>
          <Label htmlFor="apiKeyName">Key Name</Label>
          <Input
            id="apiKeyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Mobile App"
            required
          />
        </div>
        <div>
          <Label htmlFor="apiKeyExpiration">Expiration Date (Optional)</Label>
          <Input
            id="apiKeyExpiration"
            type="datetime-local"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Generating...' : 'Generate JWT Key'}
        </Button>
      </form>

      {generatedToken && (
        <div className="p-4 bg-secondary rounded-lg space-y-2">
            <Label>New JWT Generated</Label>
            <p className="text-sm text-muted-foreground">This is the only time you will see this key. Copy it and store it securely.</p>
            <div className="flex items-center gap-2">
                <Input type="text" readOnly value={generatedToken} className="flex-1" />
                <Button onClick={copyToClipboard} variant="outline">Copy</Button>
            </div>
        </div>
      )}
    </div>
  );
}
