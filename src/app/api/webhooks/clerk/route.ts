import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { StreamChat } from 'stream-chat';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(webhookSecret);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Connect to database
  await dbConnect();

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    try {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      // Create user in database
      const user = await User.create({
        clerkId: id,
        email: email_addresses[0]?.email_address,
        firstName: first_name || '',
        lastName: last_name || '',
        fullName: `${first_name || ''} ${last_name || ''}`.trim(),
        avatar: image_url,
        bio: '',
        location: '',
        skillsTeaching: [],
        skillsLearning: [],
        availability: [],
        rating: 0,
        totalReviews: 0,
        connections: [],
        onboardingComplete: false,
        isActive: true,
        joinedAt: new Date(),
        lastActive: new Date()
      });

      console.log('User created in database:', user._id);

      // Immediately upsert user to Stream for realtime availability
      try {
        const API_KEY = process.env.STREAM_KEY;
        const API_SECRET = process.env.STREAM_SECRET;
        if (API_KEY && API_SECRET) {
          const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
          await serverClient.upsertUsers([
            {
              id,
              name: `${first_name || ''} ${last_name || ''}`.trim() || undefined,
              image: image_url || undefined,
            },
          ]);
          // Ensure per-user notifications channel exists
          const notifId = `notifications_${id}`;
          const notifCh = serverClient.channel('messaging', notifId, { members: [id] });
          await notifCh.create().catch(() => {});
          console.log('Stream user upserted (created):', id);
        } else {
          console.warn('STREAM_KEY/STREAM_SECRET not set; skipping Stream upsert');
        }
      } catch (e) {
        console.error('Stream upsert (created) failed:', e);
      }
    } catch (error) {
      console.error('Error creating user in database:', error);
      return new Response('Error creating user', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    try {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      // Update user in database
      await User.findOneAndUpdate(
        { clerkId: id },
        {
          email: email_addresses[0]?.email_address,
          firstName: first_name || '',
          lastName: last_name || '',
          fullName: `${first_name || ''} ${last_name || ''}`.trim(),
          avatar: image_url,
          lastActive: new Date()
        },
        { new: true }
      );

      console.log('User updated in database:', id);

      // Keep Stream user in sync on updates
      try {
        const API_KEY = process.env.STREAM_KEY;
        const API_SECRET = process.env.STREAM_SECRET;
        if (API_KEY && API_SECRET) {
          const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
          await serverClient.upsertUsers([
            {
              id,
              name: `${first_name || ''} ${last_name || ''}`.trim() || undefined,
              image: image_url || undefined,
            },
          ]);
          // Ensure per-user notifications channel exists
          const notifId = `notifications_${id}`;
          const notifCh = serverClient.channel('messaging', notifId, { members: [id] });
          await notifCh.create().catch(() => {});
          console.log('Stream user upserted (updated):', id);
        }
      } catch (e) {
        console.error('Stream upsert (updated) failed:', e);
      }
    } catch (error) {
      console.error('Error updating user in database:', error);
      return new Response('Error updating user', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    try {
      const { id } = evt.data;

      // Soft delete user (mark as inactive)
      await User.findOneAndUpdate(
        { clerkId: id },
        { isActive: false },
        { new: true }
      );

      console.log('User soft deleted in database:', id);
    } catch (error) {
      console.error('Error deleting user in database:', error);
      return new Response('Error deleting user', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
