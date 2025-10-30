import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// PUT - Update user skills
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
    
    const { skillsTeaching, skillsLearning } = await request.json();
    
    const user = await User.findOneAndUpdate(
      { clerkId: params.clerkId },
      { 
        $set: { 
          skillsTeaching: skillsTeaching || [],
          skillsLearning: skillsLearning || [],
          lastActive: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      user: {
        skillsTeaching: user.skillsTeaching,
        skillsLearning: user.skillsLearning
      }
    });
  } catch (error) {
    console.error('Error updating skills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a single skill
export async function POST(
  request: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (userId !== params.clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { skill, type } = await request.json();
    
    if (!skill || !type) {
      return NextResponse.json(
        { error: 'Skill and type are required' },
        { status: 400 }
      );
    }

    const updateField = type === 'teaching' ? 'skillsTeaching' : 'skillsLearning';
    const skillObject = { skill };

    const user = await User.findOneAndUpdate(
      { 
        clerkId: params.clerkId,
        [`${updateField}.skill`]: { $ne: skill } // Prevent duplicates
      },
      { 
        $push: { [updateField]: skillObject },
        $set: { lastActive: new Date() }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or skill already exists' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      user: {
        skillsTeaching: user.skillsTeaching,
        skillsLearning: user.skillsLearning
      }
    });
  } catch (error) {
    console.error('Error adding skill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (userId !== params.clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { skill, type } = await request.json();
    
    if (!skill || !type) {
      return NextResponse.json(
        { error: 'Skill and type are required' },
        { status: 400 }
      );
    }

    const updateField = type === 'teaching' ? 'skillsTeaching' : 'skillsLearning';
    
    const user = await User.findOneAndUpdate(
      { clerkId: params.clerkId },
      { 
        $pull: { [updateField]: { skill } },
        $set: { lastActive: new Date() }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      user: {
        skillsTeaching: user.skillsTeaching,
        skillsLearning: user.skillsLearning
      }
    });
  } catch (error) {
    console.error('Error removing skill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
