"use client";

import React, { useState, useMemo, useEffect } from "react";
import UserCard from "@/components/UserCard";
import { experienceLevels, availabilityOptions } from "@/data/mockData";
import { FilterOptions } from "@/types";
import { listUsers } from "@/lib/api";
import { useUser } from "@clerk/nextjs";

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    skills: [],
    experience: [],
    rating: 0,
    location: "",
    availability: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [sortOption, setSortOption] = useState<"rating" | "reviews" | "recent" | "connections">("rating");
  const [smartMatch, setSmartMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await listUsers({ sort: sortOption, smart: smartMatch, q: searchQuery.trim() || undefined });
        if (res.users) setUsers(res.users as any[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (isLoaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, sortOption, smartMatch]);

  // Get all unique skills for filter options
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    users.forEach((user: any) => {
      (user.skillsTeaching || []).forEach((s: any) => skills.add(s.skill));
    });
    return Array.from(skills).sort();
  }, [users]);

  // Apply only sidebar filters on top of backend results
  const filteredUsers = useMemo(() => {
    return users.filter((user: any) => {
      // Skills filter
      if (filters.skills.length > 0) {
        const hasSkill = (user.skillsTeaching || []).some((s: any) =>
          filters.skills.includes(s.skill)
        );
        if (!hasSkill) return false;
      }

      // Experience filter
      // Experience is not in DB model; ignore for now

      // Rating filter
      if (filters.rating > 0) {
        if ((user.rating || 0) < filters.rating) return false;
      }

      // Location filter
      if (filters.location) {
        if (
          !(user.location || "")
            .toLowerCase()
            .includes(filters.location.toLowerCase())
        ) {
          return false;
        }
      }

      // Availability filter
      if (filters.availability.length > 0) {
        const hasAvailability = (user.availability || []).some((time: string) =>
          filters.availability.includes(time)
        );
        if (!hasAvailability) return false;
      }

      return true;
    });
  }, [filters, users]);

  const handleSkillFilter = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleExperienceFilter = (experience: string) => {
    setFilters((prev) => ({
      ...prev,
      experience: prev.experience.includes(experience)
        ? prev.experience.filter((e) => e !== experience)
        : [...prev.experience, experience],
    }));
  };

  const handleAvailabilityFilter = (availability: string) => {
    setFilters((prev) => ({
      ...prev,
      availability: prev.availability.includes(availability)
        ? prev.availability.filter((a) => a !== availability)
        : [...prev.availability, availability],
    }));
  };

  const clearFilters = () => {
    setFilters({
      skills: [],
      experience: [],
      rating: 0,
      location: "",
      availability: [],
    });
    setSearchQuery("");
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    setSearchQuery(query);
    try {
      setLoading(true);
      const res = await listUsers({ q: query || undefined, sort: sortOption, smart: smartMatch });
      if (res.users) setUsers(res.users as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSmartMatch = async () => {
    const next = !smartMatch;
    setSmartMatch(next);
    try {
      setLoading(true);
      const res = await listUsers({ q: searchQuery.trim() || undefined, sort: sortOption, smart: next });
      if (res.users) setUsers(res.users as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center sm:text-left">
            Learn smarter, together.
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-gray-500 text-sm sm:text-base">
              We recommend Smart Match to quickly find the most relevant people.
            </p>
            <button
              onClick={toggleSmartMatch}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-md font-medium border transition-colors ${
                smartMatch
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              title="Show only people with matching teach/learn overlap"
            >
              <i className="fas fa-magic mr-2" />
              Smart Match
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search skills, people, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-colors text-sm sm:text-base bg-blue-600 text-white hover:bg-blue-700"
            >
              <i className="fas fa-search mr-2"></i>
              Search
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-full lg:w-80 bg-white rounded-lg shadow-sm border p-4 sm:p-6 h-fit order-2 lg:order-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              </div>

              {/* Skills Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Skills</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {allSkills.map((skill) => (
                    <label key={skill} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.skills.includes(skill)}
                        onChange={() => handleSkillFilter(skill)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">
                  Experience Level
                </h4>
                <div className="space-y-1">
                  {experienceLevels.map((level) => (
                    <label key={level} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.experience.includes(level)}
                        onChange={() => handleExperienceFilter(level)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">
                  Minimum Rating
                </h4>
                <select
                  value={filters.rating}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      rating: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Any rating</option>
                  <option value={4}>4+ stars</option>
                  <option value={4.5}>4.5+ stars</option>
                  <option value={4.8}>4.8+ stars</option>
                </select>
              </div>

              {/* Location Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                <input
                  type="text"
                  placeholder="Enter city or state..."
                  value={filters.location}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Availability Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Availability</h4>
                <div className="space-y-1">
                  {availabilityOptions.map((time) => (
                    <label key={time} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.availability.includes(time)}
                        onChange={() => handleAvailabilityFilter(time)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{time}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 order-1 lg:order-2">
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <p className="text-gray-600 text-sm sm:text-base">
                {loading
                  ? "Loading..."
                  : `${filteredUsers.length} ${
                      filteredUsers.length === 1 ? "person" : "people"
                    } found`}
              </p>
              <select
                value={sortOption}
                onChange={async (e) => {
                  const val = e.target.value as typeof sortOption;
                  setSortOption(val);
                  try {
                    setLoading(true);
                    const res = await listUsers({ q: searchQuery.trim() || undefined, sort: val, smart: smartMatch });
                    if (res.users) setUsers(res.users as any[]);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
              >
                <option value="rating">Sort by rating</option>
                <option value="reviews">Sort by reviews</option>
                <option value="recent">Sort by recent</option>
                <option value="connections">Sort by connections</option>
              </select>
            </div>

            <div className="grid gap-4 sm:gap-6">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow-sm border">
                  <i className="fas fa-search text-3xl sm:text-4xl text-gray-300 mb-3 sm:mb-4"></i>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base px-4">
                    Try adjusting your search criteria or filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm sm:text-base"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                filteredUsers.map((user: any) => (
                  <UserCard
                    key={user._id}
                    user={{
                      id: user._id, // Use MongoDB ObjectId as id
                      clerkId: user.clerkId,
                      name: user.fullName || "Not specified",
                      email: user.email,
                      avatar: user.avatar || "/default-avatar.png",
                      bio: user.bio || "No bio available",
                      location: user.location || "Not specified",
                      rating: user.rating || 0,
                      totalReviews: user.totalReviews || 0,
                      skillsToTeach: (user.skillsTeaching || []).map(
                        (s: any, idx: number) => ({
                          id: `${user._id}-teach-${idx}`,
                          name: s.skill,
                          category: "General",
                          level: "Beginner",
                          yearsOfExperience: 0,
                          description: "",
                        })
                      ),
                      skillsToLearn: (user.skillsLearning || []).map(
                        (s: any) => s.skill
                      ),
                      experience: "Not specified",
                      availability:
                        user.availability?.length > 0
                          ? user.availability
                          : ["Not specified"],
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
