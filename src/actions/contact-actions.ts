// src/actions/contact-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { Contact } from '@/services/message-service';

// Schema for adding/updating contacts (matches ContactForm schema without the ID)
const ContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).max(100, {message: "Name too long."}),
  phone: z.string().regex(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/, { message: "Invalid phone number format." }).min(5, {message: "Phone number too short."}).max(20, {message: "Phone number too long."}),
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
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting contact:", error);
    return { success: false, error: error.message || "Database error occurred while deleting contact." };
  }
}
