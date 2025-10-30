export interface User {
  id: string;
  clerkId: string; // Added clerkId field
  name: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  rating: number;
  totalReviews: number;
  skillsToTeach: Skill[];
  skillsToLearn: string[];
  experience:
    | "Beginner"
    | "Intermediate"
    | "Advanced"
    | "Expert"
    | "Not specified";
  availability: string[];
  connections?: string[]; // IDs of connected users
  pendingConnectionRequests?: {
    sent: string[]; // IDs of users to whom connection requests have been sent
    received: string[]; // IDs of users from whom connection requests have been received
  };
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience: number;
  description: string;
}

export interface Review {
  id: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment: string;
  skillId: string;
  createdAt: string;
}

export interface FilterOptions {
  skills: string[];
  experience: string[];
  rating: number;
  location: string;
  availability: string[];
}
