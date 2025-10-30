import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    
    console.log('=== DATABASE TEST DEBUG ===');
    
    // Get all users to see what's in the database
    const allUsers = await User.find({}).limit(5);
    
    console.log('Total users in database:', await User.countDocuments());
    console.log('All users:', allUsers.map(u => ({
      clerkId: u.clerkId,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: u.fullName,
      email: u.email,
      avatar: u.avatar,
      bio: u.bio
    })));
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      totalUsers: await User.countDocuments(),
      users: allUsers.map(user => ({
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        skillsTeaching: user.skillsTeaching,
        skillsLearning: user.skillsLearning,
        rating: user.rating,
        totalReviews: user.totalReviews,
        joinedAt: user.joinedAt,
        onboardingComplete: user.onboardingComplete
      }))
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
