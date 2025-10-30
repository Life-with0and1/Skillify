import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET user by Clerk ID
export async function GET(
  request: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    console.log('=== API GET USER DEBUG ===');
    console.log('Requested clerkId:', params.clerkId);
    
    await dbConnect();
    
    const user = await User.findByClerkId(params.clerkId);
    
    console.log('Found user in DB:', user ? 'YES' : 'NO');
    if (user) {
      console.log('User data from DB:', {
        _id: user._id,
        clerkId: user.clerkId,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        rating: user.rating,
        totalReviews: user.totalReviews,
        skillsTeaching: user.skillsTeaching?.length || 0,
        skillsLearning: user.skillsLearning?.length || 0
      });
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const { userId } = await auth();
    
    // Check if authenticated user is updating their own profile
    if (userId !== params.clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const updateData = await request.json();
    
    // Update lastActive timestamp
    updateData.lastActive = new Date();
    
    const user = await User.findOneAndUpdate(
      { clerkId: params.clerkId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const { userId } = await auth();
    
    // Check if authenticated user is deleting their own profile
    if (userId !== params.clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const user = await User.findOneAndUpdate(
      { clerkId: params.clerkId },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
