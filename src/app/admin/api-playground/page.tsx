"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
export default function ApiPlayground() {
  const [endpoint, setEndpoint] = useState('http://localhost:3000/api/messages/send-template');
  const [token, setToken] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
    const apiOptions = [
        { label: 'Send Template Message', value: 'http://localhost:3000/api/messages/send-template', 
          defaultBody: {
            "templateId": "template123",
            "recipientIds": ["contact456", "contact789"],
            "placeholders": {
              "name": "John",
              "event": "Meeting"
            }
          }
        },
        { label: 'Send Bulk Message', value: 'http://localhost:3000/api/messages/send-bulk', 
          defaultBody: {
            "recipientIds": ["contact456", "contact789"],
            "messageBody": "Hello everyone!"
          }
        },
        { label: 'Send Private Message', value: 'http://localhost:3000/api/messages/send-private', 
          defaultBody: {
            "recipientId": "contact456",
            "messageBody": "Hello!"}
        }
    ];
    // Update request body when endpoint changes
    useEffect(() => {
        const selectedApi = apiOptions.find(option => option.value === endpoint);
        if (selectedApi) {
            setRequestBody(selectedApi.defaultBody);
        }
    }, [endpoint]);
  const handleSendRequest = async () => {
    setLoading(true);
    setResponse(''); // Clear previous response
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: requestBody,
      });
      const text = await res.text(); // Get the response body as text
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}, Response: ${text}`);
      }
      setResponse(text);
    } catch (error: any) {
      console.error('Error sending request:', error);
      setResponse(`Error: ${error.message}`);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    };
  };
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">API Playground</h2>
      <p className="text-muted-foreground">
        Test your API endpoints with a valid JWT.
      </p>
      <div className="grid gap-4">
          <Card>
              <CardHeader>
                  <Label htmlFor="api-endpoint-select">API Endpoint</Label>
                  <Select onValueChange={setEndpoint} defaultValue={endpoint}>
                      <SelectTrigger id="api-endpoint-select">
                          <SelectValue placeholder="Select an API Endpoint" />
                      </SelectTrigger>
                      <SelectContent>
                          {apiOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </CardHeader>
          </Card>
        <Card>
          <CardHeader>
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="e.g., /api/messages/send-template"
            />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Label htmlFor="token">JWT Token</Label>
            <Input
              id="token"
              type="password" // Mask the token for security
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your JWT token"
            />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Label htmlFor="requestBody">Request Body</Label>
            <Textarea
              id="requestBody"
              className="min-h-[100px]"
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              placeholder="Enter request body (JSON)"
            />
          </CardHeader>
        </Card>
        <Button onClick={handleSendRequest} disabled={loading}>
          {loading ? 'Sending...' : 'Send Request'}
        </Button>
        {response && (
          <Card>
            <CardHeader>
              <Label>Response</Label>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap break-words">
              {response}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
