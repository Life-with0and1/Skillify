import { User } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    clerkId: 'clerk_alice_123',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    bio: 'Full-stack developer with 5 years of experience. Love teaching React and Node.js!',
    location: 'San Francisco, CA',
    rating: 4.8,
    totalReviews: 24,
    experience: 'Expert',
    availability: ['Evenings', 'Weekends'],
    skillsToTeach: [
      {
        id: '1',
        name: 'React.js',
        category: 'Frontend Development',
        level: 'Advanced',
        yearsOfExperience: 4,
        description: 'Building modern web applications with React hooks and context'
      },
      {
        id: '2',
        name: 'Node.js',
        category: 'Backend Development',
        level: 'Intermediate',
        yearsOfExperience: 3,
        description: 'Server-side JavaScript development with Express.js'
      }
    ],
    skillsToLearn: ['Machine Learning', 'Docker', 'AWS']
  },
  {
    id: '2',
    clerkId: 'clerk_michael_456',
    name: 'Michael Chen',
    email: 'michael@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Data scientist passionate about ML and Python. Happy to share knowledge!',
    location: 'New York, NY',
    rating: 4.9,
    totalReviews: 31,
    experience: 'Expert',
    availability: ['Mornings', 'Afternoons'],
    skillsToTeach: [
      {
        id: '3',
        name: 'Python',
        category: 'Programming',
        level: 'Expert',
        yearsOfExperience: 6,
        description: 'Python for data science, web development, and automation'
      },
      {
        id: '4',
        name: 'Machine Learning',
        category: 'Data Science',
        level: 'Advanced',
        yearsOfExperience: 4,
        description: 'ML algorithms, neural networks, and deep learning'
      }
    ],
    skillsToLearn: ['React.js', 'DevOps', 'Kubernetes']
  },
  {
    id: '3',
    clerkId: 'clerk_sarah_789',
    name: 'Sarah Williams',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    bio: 'UX/UI Designer with a passion for creating beautiful user experiences.',
    location: 'Austin, TX',
    rating: 4.7,
    totalReviews: 18,
    experience: 'Advanced',
    availability: ['Evenings', 'Weekends'],
    skillsToTeach: [
      {
        id: '5',
        name: 'UI/UX Design',
        category: 'Design',
        level: 'Advanced',
        yearsOfExperience: 5,
        description: 'User interface and experience design using Figma and Adobe XD'
      },
      {
        id: '6',
        name: 'Figma',
        category: 'Design Tools',
        level: 'Expert',
        yearsOfExperience: 3,
        description: 'Advanced Figma techniques for prototyping and collaboration'
      }
    ],
    skillsToLearn: ['Frontend Development', 'Animation', 'Illustration']
  },
  {
    id: '4',
    clerkId: 'clerk_david_012',
    name: 'David Rodriguez',
    email: 'david@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    bio: 'DevOps engineer helping teams deploy faster and more reliably.',
    location: 'Seattle, WA',
    rating: 4.6,
    totalReviews: 22,
    experience: 'Expert',
    availability: ['Mornings', 'Evenings'],
    skillsToTeach: [
      {
        id: '7',
        name: 'Docker',
        category: 'DevOps',
        level: 'Advanced',
        yearsOfExperience: 4,
        description: 'Containerization and orchestration with Docker and Docker Compose'
      },
      {
        id: '8',
        name: 'AWS',
        category: 'Cloud Computing',
        level: 'Advanced',
        yearsOfExperience: 5,
        description: 'Amazon Web Services architecture and deployment strategies'
      }
    ],
    skillsToLearn: ['Kubernetes', 'Terraform', 'GraphQL']
  }
];

export const skillCategories = [
  'Frontend Development',
  'Backend Development',
  'Data Science',
  'Design',
  'DevOps',
  'Mobile Development',
  'Cloud Computing',
  'Programming',
  'Design Tools'
];

export const experienceLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
export const availabilityOptions = ['Mornings', 'Afternoons', 'Evenings', 'Weekends'];
