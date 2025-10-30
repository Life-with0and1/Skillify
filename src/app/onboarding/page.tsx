"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedIn, useAuth } from "@clerk/nextjs";

const OnboardingPage = () => {
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    skillsToLearn: [] as string[],
    skillsToTeach: [] as string[],
    bio: "",
    location: "",
    experience: "Beginner" as
      | "Beginner"
      | "Intermediate"
      | "Advanced"
      | "Expert",
    availability: [] as string[],
  });
  const [step, setStep] = useState(1);

  // If signed-in and already completed, go to dashboard
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const onboardingComplete = localStorage.getItem("onboardingComplete");
    const cookieComplete = document.cookie.includes("onboarding-complete=true");

    if (
      onboardingComplete === "true" ||
      cookieComplete ||
      user?.publicMetadata?.onboardingComplete === true
    ) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router, user?.publicMetadata]);

  // Loading screen while auth resolves (avoid flicker/loops)
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const availableSkills = [
    "React.js",
    "Node.js",
    "TypeScript",
    "Python",
    "Machine Learning",
    "UI/UX Design",
    "Figma",
    "Adobe Creative Suite",
    "JavaScript",
    "HTML/CSS",
    "Vue.js",
    "Angular",
    "Django",
    "Flask",
    "AWS",
    "Docker",
    "MongoDB",
    "SQL",
    "Firebase",
    "TensorFlow",
    "React Native",
    "iOS Development",
    "Android Development",
    "SEO",
    "Google Ads",
    "Social Media Marketing",
    "Analytics",
    "User Research",
    "Prototyping",
    "Photography",
    "Video Editing",
    "Graphic Design",
    "Content Writing",
    "Public Speaking",
    "Project Management",
    "Agile",
    "Scrum",
    "Git",
    "DevOps",
  ];

  const experienceLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
  const availabilityOptions = [
    "Mornings",
    "Afternoons",
    "Evenings",
    "Weekends",
  ];

  const toggleSkill = (skill: string, type: "learn" | "teach") => {
    const field = type === "learn" ? "skillsToLearn" : "skillsToTeach";
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(skill)
        ? prev[field].filter((s) => s !== skill)
        : [...prev[field], skill],
    }));
  };

  const toggleAvailability = (time: string) => {
    setFormData((prev) => ({
      ...prev,
      availability: prev.availability.includes(time)
        ? prev.availability.filter((t) => t !== time)
        : [...prev.availability, time],
    }));
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userProfile = {
      userId: user?.id,
      email: user?.emailAddresses[0]?.emailAddress,
      firstName: user?.firstName,
      lastName: user?.lastName,
      avatar: user?.imageUrl,
      ...formData,
      rating: 0,
      totalReviews: 0,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    localStorage.setItem("onboardingComplete", "true");

    // Set cookie and metadata before navigating
    document.cookie = "onboarding-complete=true; path=/; max-age=31536000";

    try {
      await user?.update({
        publicMetadata: {
          ...(user?.publicMetadata || {}),
          onboardingComplete: true,
        },
      } as any);
    } catch (error) {
      console.log("Error updating user metadata:", error);
    }

    // Redirect to dashboard after completion
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Tell us about your skills and interests to get started
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step > stepNumber ? (
                    <i className="fas fa-check text-xs"></i>
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step > stepNumber ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Skills to Learn */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  What skills do you want to learn?
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {availableSkills.map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.skillsToLearn.includes(skill)}
                        onChange={() => toggleSkill(skill, "learn")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    Next Step
                    <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Skills to Teach */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  What skills can you teach?
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {availableSkills.map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.skillsToTeach.includes(skill)}
                        onChange={() => toggleSkill(skill, "teach")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    Next Step
                    <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Experience & Availability */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Experience & Availability
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Experience Level
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        experience: e.target.value as any,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {experienceLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    When are you available?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availabilityOptions.map((time) => (
                      <label
                        key={time}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.availability.includes(time)}
                          onChange={() => toggleAvailability(time)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{time}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    Next Step
                    <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Bio & Location */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Tell us about yourself
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Tell others about your expertise, teaching style, and what you can help them learn..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="City, State or Country"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Profile Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Profile Summary
                  </h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>
                      <strong>Name:</strong> {user?.firstName} {user?.lastName}
                    </p>
                    <p>
                      <strong>Skills to Learn:</strong>{" "}
                      {formData.skillsToLearn.join(", ") || "None selected"}
                    </p>
                    <p>
                      <strong>Skills to Teach:</strong>{" "}
                      {formData.skillsToTeach.join(", ") || "None selected"}
                    </p>
                    <p>
                      <strong>Experience:</strong> {formData.experience}
                    </p>
                    <p>
                      <strong>Availability:</strong>{" "}
                      {formData.availability.join(", ") || "None selected"}
                    </p>
                    <p>
                      <strong>Location:</strong>{" "}
                      {formData.location || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
