// src/actions/template-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { MessageTemplate } from '@/services/message-service';

// Schema for adding/updating templates (matches TemplateForm schema without the ID)
const TemplateSchema = z.object({
    name: z.string().min(1, { message: "Template name is required." }).max(100, {message: "Name too long."}),
    content: z.string().min(1, { message: "Template content cannot be empty." }).max(1000, {message: "Content too long."})
      .refine(val => !val.includes('{}') && !val.includes('{ }'), { message: "Empty braces {} are not allowed. Use {{parameter_name}}."})
      .refine(val => {
          const matches = val.match(/\{\{[^\{\}]*?\}\}/g) || [];
          const invalidMatches = val.match(/\{[^{}]*?\}/g)?.filter(m => !matches.includes(m)) || [];
          return invalidMatches.length === 0;
      }, { message: "Use double curly braces for parameters, e.g., {{name}}."}),
});

// --- Get All Templates ---
export async function getTemplates(): Promise<MessageTemplate[]> {
  try {
    const db = await getDb();
    const templates = await db.collection<MessageTemplate>('templates').find({}).sort({ name: 1 }).toArray();
    // Convert ObjectId to string for serialization
    return templates.map(template => ({
      ...template,
      _id: template._id?.toString(),
    }));
  } catch (error) {
    console.error("Error fetching templates:", error);
    return []; // Return empty array on error
  }
}

// --- Add Template ---
type AddTemplateResult = { success: true; template: MessageTemplate } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function addTemplate(formData: unknown): Promise<AddTemplateResult> {
  const validatedFields = TemplateSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Validation failed. Please check the form fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, content } = validatedFields.data;

  try {
    const db = await getDb();
    // Optional: Check if template name already exists
    const existingTemplate = await db.collection('templates').findOne({ name });
    if (existingTemplate) {
      return {
        success: false,
        error: "A template with this name already exists.",
        fieldErrors: { name: ["Template name already in use."] }
      };
    }

    const result = await db.collection<Omit<MessageTemplate, '_id'>>('templates').insertOne({ name, content });

    if (!result.insertedId) {
      throw new Error('Failed to insert template into database.');
    }

    revalidatePath('/dashboard/templates'); // Revalidate the templates page cache
    return {
      success: true,
      template: {
        _id: result.insertedId.toString(),
        name,
        content,
      },
    };
  } catch (error: any) {
    console.error("Error adding template:", error);
    return { success: false, error: error.message || "Database error occurred while adding template." };
  }
}

// --- Update Template ---
type UpdateTemplateResult = { success: true; template: MessageTemplate } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateTemplate(id: string, formData: unknown): Promise<UpdateTemplateResult> {
   if (!ObjectId.isValid(id)) {
     return { success: false, error: "Invalid template ID format." };
   }

  const validatedFields = TemplateSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Validation failed. Please check the form fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, content } = validatedFields.data;
  const objectId = new ObjectId(id);

  try {
    const db = await getDb();
     // Optional: Check if the new name conflicts with another template
    const conflictingTemplate = await db.collection('templates').findOne({ name: name, _id: { $ne: objectId } });
    if (conflictingTemplate) {
        return {
            success: false,
            error: "This template name is already used by another template.",
            fieldErrors: { name: ["Template name already in use."] }
        };
    }


    const result = await db.collection<MessageTemplate>('templates').findOneAndUpdate(
      { _id: objectId },
      { $set: { name, content } },
      { returnDocument: 'after' } // Return the updated document
    );

     if (!result) {
      return { success: false, error: "Template not found or update failed." };
    }

    revalidatePath('/dashboard/templates');
    return {
        success: true,
        template: { // Ensure the returned template has _id as string
            ...result,
            _id: result._id.toString(),
        }
    };
  } catch (error: any) {
    console.error("Error updating template:", error);
    return { success: false, error: error.message || "Database error occurred while updating template." };
  }
}

// --- Delete Template ---
type DeleteTemplateResult = { success: true } | { success: false; error: string };

export async function deleteTemplate(id: string): Promise<DeleteTemplateResult> {
  if (!ObjectId.isValid(id)) {
    return { success: false, error: "Invalid template ID format." };
  }
  const objectId = new ObjectId(id);

  try {
    const db = await getDb();
    const result = await db.collection('templates').deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return { success: false, error: "Template not found or already deleted." };
    }

    revalidatePath('/dashboard/templates');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return { success: false, error: error.message || "Database error occurred while deleting template." };
  }
}
