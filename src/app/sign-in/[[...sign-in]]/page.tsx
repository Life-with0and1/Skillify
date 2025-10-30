import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Skillify
          </h1>
          <p className="text-gray-600">
            Sign in to start sharing and learning skills
          </p>
        </div>
        <SignIn 
        />
      </div>
    </div>
  );
}
