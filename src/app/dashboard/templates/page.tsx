import { TemplateTable } from '@/components/templates/template-table';
import { AddTemplateDialog } from '@/components/templates/add-template-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Mock data - Replace with API fetching
const mockTemplates = [
  { id: 't1', name: 'Welcome Message', content: 'Hi {{name}}, welcome aboard!' },
  { id: 't2', name: 'Appointment Reminder', content: 'Reminder: Your appointment is on {{date}} at {{time}}.' },
  { id: 't3', name: 'Promotional Offer', content: 'Special offer for {{product}}! Get {{discount}} off today.' },
];

export default async function TemplatesPage() {
  // TODO: Fetch templates from API
  const templates = mockTemplates;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Templates</h1>
         <AddTemplateDialog triggerButton={
           <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Template
           </Button>
         }/>
      </div>
       <p className="text-muted-foreground mb-4">
        Create and manage reusable message templates. Use double curly braces for parameters, e.g., <code className="bg-muted px-1 rounded text-sm font-mono">{`{{parameter_name}}`}</code>.
      </p>
      <TemplateTable templates={templates} />
    </div>
  );
}
