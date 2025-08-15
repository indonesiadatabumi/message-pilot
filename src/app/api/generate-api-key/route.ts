import { NextResponse } from 'next/server';
import ApiKey from '@/models/ApiKey'; // Import the ApiKey model
import dbConnect from '@/lib/mongodb'; // Import your MongoDB connection utility

export async function POST(req: Request) {
  try {
    const { name, expiration } = await req.json();

    // Generate a placeholder token string for now
    const key = `TEMP_TOKEN_${Date.now()}`; // Use 'key' to match model field

    console.log('Generating API Key:');
    console.log('Name:', name);
    console.log('Expiration:', expiration);
    console.log('Generated Key:', key);

    await dbConnect(); // Connect to MongoDB

    const newApiKey = new ApiKey({
      key,
      name,
      expiration: expiration ? new Date(expiration) : null, // Convert expiration string to Date or null
    });
    await newApiKey.save(); // Save the new API key to the database

    return NextResponse.json({ success: true, token: placeholderToken });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error generating API key' }, { status: 500 });
  }
}