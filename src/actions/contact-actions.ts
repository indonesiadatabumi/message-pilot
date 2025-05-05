// src/actions/contact-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { Contact } from '@/services/message-service';

// Schema for adding/updating contacts (matches ContactForm schema without the ID)
const ContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).max(100, { message: "Name too long." }),
  phone: z.string().regex(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/, { message: "Invalid phone number format." }).min(5, { message: "Phone number too short." }).max(20, { message: "Phone number too long." }),
});

// --- Get All Contacts ---
export async function getContacts(): Promise<Contact[]> {
  try {
    const db = await getDb();
    const contacts = await db.collection<Contact>('contacts').find({}).sort({ name: 1 }).toArray();
    // Convert ObjectId to string for serialization
    return contacts.map(contact => ({
      ...contact,
      _id: contact._id?.toString(),
    }));
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return []; // Return empty array on error
  }
}

// --- Add Contact ---
type AddContactResult = { success: true; contact: Contact } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function addContact(formData: unknown): Promise<AddContactResult> {
  const validatedFields = ContactSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Validation failed. Please check the form fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, phone } = validatedFields.data;

  try {
    const db = await getDb();
    // Check if phone number already exists
    const existingContact = await db.collection('contacts').findOne({ phone });
    if (existingContact) {
      return {
        success: false,
        error: "A contact with this phone number already exists.",
        fieldErrors: { phone: ["Phone number already in use."] }
      };
    }

    const result = await db.collection<Omit<Contact, '_id'>>('contacts').insertOne({ name, phone });

    if (!result.insertedId) {
      throw new Error('Failed to insert contact into database.');
    }

    revalidatePath('/dashboard/contacts'); // Revalidate the contacts page cache
    revalidatePath('/dashboard/send'); // Revalidate the send page cache
    return {
      success: true,
      contact: {
        _id: result.insertedId.toString(),
        name,
        phone,
      },
    };
  } catch (error: any) {
    console.error("Error adding contact:", error);
    return { success: false, error: error.message || "Database error occurred while adding contact." };
  }
}

// --- Update Contact ---
type UpdateContactResult = { success: true; contact: Contact } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateContact(id: string, formData: unknown): Promise<UpdateContactResult> {
  if (!ObjectId.isValid(id)) {
    return { success: false, error: "Invalid contact ID format." };
  }

  const validatedFields = ContactSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Validation failed. Please check the form fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, phone } = validatedFields.data;
  const objectId = new ObjectId(id);

  try {
    const db = await getDb();
    // Check if the new phone number conflicts with another contact
    const conflictingContact = await db.collection('contacts').findOne({ phone: phone, _id: { $ne: objectId } });
    if (conflictingContact) {
      return {
        success: false,
        error: "This phone number is already used by another contact.",
        fieldErrors: { phone: ["Phone number already in use by another contact."] }
      };
    }

    const result = await db.collection<Contact>('contacts').findOneAndUpdate(
      { _id: objectId },
      { $set: { name, phone } },
      { returnDocument: 'after' } // Return the updated document
    );

    if (!result) {
      return { success: false, error: "Contact not found or update failed." };
    }

    revalidatePath('/dashboard/contacts');
    revalidatePath('/dashboard/send'); // Revalidate the send page cache
    return {
      success: true,
      contact: { // Ensure the returned contact has _id as string
        ...result,
        _id: result._id.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error updating contact:", error);
    return { success: false, error: error.message || "Database error occurred while updating contact." };
  }
}


// --- Delete Contact ---
type DeleteContactResult = { success: true } | { success: false; error: string };

export async function deleteContact(id: string): Promise<DeleteContactResult> {
  if (!ObjectId.isValid(id)) {
    return { success: false, error: "Invalid contact ID format." };
  }
  const objectId = new ObjectId(id);

  try {
    const db = await getDb();
    const result = await db.collection('contacts').deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return { success: false, error: "Contact not found or already deleted." };
    }

    revalidatePath('/dashboard/contacts');
    revalidatePath('/dashboard/send'); // Revalidate the send page cache
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting contact:", error);
    return { success: false, error: error.message || "Database error occurred while deleting contact." };
  }
}

// --- Import Contacts ---
// Define the expected structure of imported contact data
const ImportedContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/).min(5).max(20),
});
type ImportedContact = z.infer<typeof ImportedContactSchema>;

type ImportContactsResult = {
  success: boolean;
  message: string;
  added: number;
  skipped: number;
  errors: { row: number; message: string; data: any }[];
};

export async function importContacts(importedData: ImportedContact[]): Promise<ImportContactsResult> {
  console.log("[Action] Starting contact import...");
  let added = 0;
  let skipped = 0;
  const errors: ImportContactsResult['errors'] = [];

  if (!Array.isArray(importedData) || importedData.length === 0) {
    return { success: false, message: "No valid contact data provided for import.", added, skipped, errors };
  }

  try {
    const db = await getDb();
    const contactsCollection = db.collection('contacts');

    // Fetch existing phone numbers to efficiently check for duplicates
    const existingPhones = new Set(
      (await contactsCollection.find({}, { projection: { phone: 1 } }).toArray()).map(c => c.phone)
    );
    console.log(`[Action] Found ${existingPhones.size} existing phone numbers.`);

    const contactsToInsert: Omit<Contact, '_id'>[] = [];

    for (let i = 0; i < importedData.length; i++) {
      const rowData = importedData[i];
      const rowIndex = i + 1; // For user-friendly row numbering in errors

      // Validate each row using Zod schema
      const validation = ImportedContactSchema.safeParse(rowData);

      if (!validation.success) {
        errors.push({
          row: rowIndex,
          message: `Validation failed: ${validation.error.flatten().fieldErrors.name?.[0] || validation.error.flatten().fieldErrors.phone?.[0] || 'Invalid data'}`,
          data: rowData,
        });
        console.warn(`[Action] Skipping row ${rowIndex} due to validation error.`);
        skipped++; // Count validation errors as skipped
        continue;
      }

      const { name, phone } = validation.data;

      // Check for duplicates based on phone number within the existing DB and the current import batch
      if (existingPhones.has(phone) || contactsToInsert.some(c => c.phone === phone)) {
        skipped++;
        console.log(`[Action] Skipping row ${rowIndex}: Phone number ${phone} already exists or is duplicated in import.`);
        // Optionally add to errors if you want to report skipped duplicate rows specifically
        // errors.push({ row: rowIndex, message: "Duplicate phone number", data: rowData });
        continue;
      }

      // Add valid, non-duplicate contact to the batch
      contactsToInsert.push({ name, phone });
    }

    // Perform bulk insert if there are contacts to add
    if (contactsToInsert.length > 0) {
      console.log(`[Action] Attempting to insert ${contactsToInsert.length} new contacts.`);
      const insertResult = await contactsCollection.insertMany(contactsToInsert);
      added = insertResult.insertedCount;
      console.log(`[Action] Successfully inserted ${added} contacts.`);
    } else {
      console.log("[Action] No new contacts to insert.");
    }

    if (added > 0) {
      revalidatePath('/dashboard/contacts');
      revalidatePath('/dashboard/send'); // Revalidate the send page cache
    }

    // Determine overall success: true only if NO errors (validation or duplicates reported as errors) occurred.
    // Modify the definition of 'success' if duplicates shouldn't fail the overall import.
    // Current logic: Success means 0 validation errors. Skipped duplicates are reported but don't cause failure.
    const isSuccess = errors.length === 0;

    let finalMessage = `Import finished. Added: ${added}, Skipped (duplicates or invalid): ${skipped}.`;
    if (errors.length > 0) {
      finalMessage += ` Errors found: ${errors.length}. Check details for more information.`;
      console.warn(`[Action] Import completed with ${errors.length} errors.`);
    } else {
      console.log(`[Action] Import completed successfully.`);
    }


    return {
      success: isSuccess,
      message: finalMessage,
      added,
      skipped,
      errors,
    };

  } catch (error: any) {
    console.error("Error during contact import:", error);
    return {
      success: false,
      message: `Database error during import: ${error.message || 'Unknown error'}`,
      added,
      skipped,
      errors, // Include any errors collected before the exception
    };
  }
}