const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define the schema inline since we can't import from TypeScript files directly
const skillTeachingSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  experience: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner'
  },
  verified: { type: Boolean, default: false }
});

const skillLearningSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  }
});

const userSchema = new mongoose.Schema({
  clerkId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fullName: { type: String, required: true },
  avatar: { type: String },
  bio: { type: String, maxlength: 500 },
  location: { type: String },
  skillsTeaching: [skillTeachingSchema],
  skillsLearning: [skillLearningSchema],
  availability: [{ type: String }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  onboardingComplete: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const User = mongoose.model('User', userSchema);

async function createFirstUser() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Your Clerk ID
    const clerkId = 'user_32hC75p4x6tUcbLJzT8HXZqwq26';
    
    // Check if user already exists
    const existingUser = await User.findOne({ clerkId });
    
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      console.log('User data:', JSON.stringify(existingUser, null, 2));
      return;
    }

    // Create the first user with sample data
    const userData = {
      clerkId: clerkId,
      email: 'ayushkumarit01@gmail.com', // Replace with your actual email
      firstName: 'Ayush',
      lastName: 'Kumar',
      fullName: 'Ayush Kumar',
      avatar: 'https://images.clerk.com/uploaded/img_2l5CjOXwdGZDI0qxXgQMnar2x0x', // Sample avatar
      bio: 'Full-stack developer passionate about creating amazing web applications. Love teaching React, Node.js, and modern web technologies. Always excited to learn new skills and connect with fellow developers!',
      location: 'India',
      skillsTeaching: [
        { skill: 'React.js', experience: 'Advanced', verified: true },
        { skill: 'Node.js', experience: 'Advanced', verified: true },
        { skill: 'TypeScript', experience: 'Intermediate', verified: false },
        { skill: 'JavaScript', experience: 'Expert', verified: true },
        { skill: 'Next.js', experience: 'Intermediate', verified: false },
        { skill: 'MongoDB', experience: 'Intermediate', verified: false },
        { skill: 'Express.js', experience: 'Advanced', verified: true }
      ],
      skillsLearning: [
        { skill: 'Python', priority: 'High' },
        { skill: 'Machine Learning', priority: 'High' },
        { skill: 'DevOps', priority: 'Medium' },
        { skill: 'AWS', priority: 'Medium' },
        { skill: 'Docker', priority: 'Low' },
        { skill: 'Kubernetes', priority: 'Low' }
      ],
      availability: ['Mornings', 'Evenings', 'Weekends'],
      rating: 4.8,
      totalReviews: 15,
      connections: [],
      onboardingComplete: true,
      isActive: true,
      joinedAt: new Date(),
      lastActive: new Date()
    };

    // Create the user
    const newUser = await User.create(userData);
    
    console.log('✅ First user created successfully!');
    console.log('User ID:', newUser._id);
    console.log('Clerk ID:', newUser.clerkId);
    console.log('Email:', newUser.email);
    console.log('Full Name:', newUser.fullName);
    console.log('Skills Teaching:', newUser.skillsTeaching.length);
    console.log('Skills Learning:', newUser.skillsLearning.length);
    console.log('Rating:', newUser.rating);
    console.log('Total Reviews:', newUser.totalReviews);
    
  } catch (error) {
    console.error('❌ Error creating first user:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the script
createFirstUser();
