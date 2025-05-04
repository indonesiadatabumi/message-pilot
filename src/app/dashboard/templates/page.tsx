import { TemplateTable } from '@/components/templates/template-table';
import { AddTemplateDialog } from '@/components/templates/add-template-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getTemplates } from '@/actions/template-actions'; // Import server action
import type { MessageTemplate } from '@/services/message-service'; // Keep type import

export default async function TemplatesPage() {
  // Fetch templates using the server action
  const templates: MessageTemplate[] = await getTemplates();

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
        Create and manage reusable message templates. Use double curly braces for parameters, e.g., <code className="bg-muted px-1 rounded text-sm font-mono">{`{{parameterName}}`}</code>.
      </p>
      {/* Pass fetched templates to the table */}
      <TemplateTable templates={templates} />
    </div>
  );
}
