import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, expirationDate } = req.body;

    console.log('Generating token for user:', userId);
    console.log('Expiration date:', expirationDate);

    // Placeholder success response
    res.status(200).json({ message: 'Token generation initiated (placeholder)' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}