# 🎓 Skillify

> **Connect. Learn. Grow. Together.**

A revolutionary peer-to-peer learning platform that connects skilled individuals for knowledge exchange without the hefty price tag of traditional courses.


[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Skillify-blue?style=for-the-badge)](https://skillify-5gfp7lg0a-life-with0and1s-projects.vercel.app/)
[![GitHub Stars](https://img.shields.io/github/stars/Life-with0and1/Skillify?style=for-the-badge&logo=github)](https://github.com/Life-with0and1/Skillify)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

---

## 💡 The Idea Behind Skillify

**The Problem**: Learning new skills often means expensive courses, rigid schedules, and one-size-fits-all content.

**The Solution**: What if you could directly connect with skilled individuals who are passionate about sharing their knowledge? What if learning could be personalized, affordable, and built on genuine human connections?

Skillify was born from the frustration of paying premium prices for courses when there are talented people everywhere willing to share their expertise. Instead of another course marketplace, we created a **peer-to-peer learning ecosystem** where knowledge flows freely between passionate learners and skilled mentors.

---

## 🚀 Features

### ✅ **Currently Live**
- 🔐 **Secure Authentication** - Powered by Clerk for seamless sign-up/login
- 👥 **Smart User Discovery** - Find mentors and learners based on skills and expertise
- 💬 **Real-time Messaging** - Connect instantly with potential learning partners
- 📹 **Video Calls** - Built-in video calling for live learning sessions
- 🔔 **Smart Notifications** - Stay updated on connection requests and messages
- ⭐ **Rating System** - Build trust through community reviews
- 📱 **Responsive Design** - Perfect experience across all devices
- 🎯 **Skill Matching** - Advanced algorithms to match complementary skills
- 📊 **Personal Dashboard** - Track your learning journey and connections

### 🔄 **Connection System**
- Send and receive connection requests
- Accept/withdraw requests with real-time updates
- Smart notification management
- Direct messaging between connected users

---

## 🧠 Future Roadmap

### 🤖 **AI-Powered Features** (Coming Soon)
- **Smart Skill Matching** - AI algorithms to find perfect learning partners
- **Personalized Learning Paths** - Custom roadmaps based on your goals
- **Session Insights** - AI analysis of learning sessions for improvement tips
- **Content Recommendations** - Curated resources based on your learning style

### 📚 **Course Creation Platform**
- **Structured Learning Modules** - Create and share comprehensive courses
- **Interactive Content** - Quizzes, assignments, and hands-on projects
- **Progress Tracking** - Monitor learner advancement through courses
- **Certification System** - Issue verified certificates for completed courses

### 💎 **Premium Tier**
- **Priority Access** - Connect with top-rated mentors instantly
- **Extended Sessions** - Longer video calls and dedicated mentoring time
- **Advanced Analytics** - Detailed insights into your learning progress
- **Exclusive Content** - Access to premium courses and resources
- **1-on-1 Coaching** - Personalized mentoring from industry experts

### 🌟 **Community Features**
- **Learning Groups** - Join study groups for collaborative learning
- **Skill Challenges** - Participate in community coding/design challenges
- **Knowledge Sharing** - Blog posts and tutorials from community members
- **Events & Workshops** - Virtual meetups and learning events

---

## 🛠️ Tech Stack

### **Frontend**
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### **Backend & Database**
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)

### **Authentication & Communication**
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![Stream](https://img.shields.io/badge/Stream-005FFF?style=for-the-badge&logo=stream&logoColor=white)

### **Deployment & Tools**
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)

---

## 🧩 Installation & Setup

### **Prerequisites**
- Node.js 18+ and npm
- MongoDB database
- Clerk account for authentication
- Stream account for video/chat features

### **1. Clone the Repository**
```bash
git clone https://github.com/Life-with0and1/Skillify.git
cd Skillify
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Setup**
Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Database
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=Skillify

# Stream (Video/Chat)
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
STREAM_SECRET_KEY=your_stream_secret_key

# Webhooks
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
```

### **4. Run the Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Skillify in action! 🎉

### **5. Build for Production**
```bash
npm run build
npm start
```

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Here's how you can help:

### **Getting Started**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to your branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Contribution Areas**
- 🐛 **Bug Fixes** - Help us squash bugs and improve stability
- ✨ **New Features** - Implement items from our roadmap
- 🎨 **UI/UX Improvements** - Enhance the user experience
- 📚 **Documentation** - Improve docs and add tutorials
- 🧪 **Testing** - Add tests to improve code quality

### **Development Guidelines**
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write clear, descriptive commit messages
- Add comments for complex logic
- Test your changes thoroughly


## 🌟 Support the Project

If Skillify has helped you learn something new or connect with amazing people, consider:

- ⭐ **Starring this repository**
- 🐛 **Reporting bugs** or suggesting features
- 💬 **Sharing with your network**
- 🤝 **Contributing code** or documentation

---

## 📞 Connect With Us

- 🌐 **Live Demo**: [skillify-5gfp7lg0a-life-with0and1s-projects.vercel.app](https://skillify-5gfp7lg0a-life-with0and1s-projects.vercel.app/)
- 💻 **GitHub**: [Life-with0and1/Skillify](https://github.com/Life-with0and1/Skillify)
- 📧 **Issues**: [Report a Bug](https://github.com/Life-with0and1/Skillify/issues)

---

<div align="center">

### ⭐ **Star the repo and join the journey to redefine learning!** ⭐

*Made with ❤️ by developers who believe knowledge should be accessible to everyone*

</div>
