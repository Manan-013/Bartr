import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "../firebase"; // Corrected import path
import { getDocs, collection } from "firebase/firestore";
import { AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  Plus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SkillCard from "../components/marketplace/SkillCard";
import FilterSidebar from "../components/marketplace/FilterSidebar";

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    levels: [],
    maxCredits: 100,
    freeOnly: false
  });

  useEffect(() => {
    const fetchListings = async () => {
      const querySnapshot = await getDocs(collection(db, "skillListings"));
      const listingsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setListings(listingsData);
      setListingsLoading(false);
    };

    fetchListings();
  }, []);

  const profilesMap = useMemo(() => {
    const map = {};
    listings.forEach(listing => {
      map[listing.user_id] = {
        username: listing.user_id ? listing.user_id.split('@')[0] : 'demo-user',
        avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${listing.user_id || 'demo-user'}`
      };
    });
    return map;
  }, [listings]);

  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(listing =>
        listing.title?.toLowerCase().includes(query) ||
        listing.description?.toLowerCase().includes(query) ||
        listing.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter(listing => filters.categories.includes(listing.category));
    }

    // Level filter
    if (filters.levels.length > 0) {
      result = result.filter(listing => filters.levels.includes(listing.level));
    }

    // Credits filter
    result = result.filter(listing => listing.credits_per_hour <= filters.maxCredits);

    // Free only filter
    if (filters.freeOnly) {
      result = result.filter(listing => listing.credits_per_hour === 0);
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case 'popular':
        result.sort((a, b) => (b.total_sessions || 0) - (a.total_sessions || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        break;
      case 'credits_low':
        result.sort((a, b) => a.credits_per_hour - b.credits_per_hour);
        break;
      case 'credits_high':
        result.sort((a, b) => b.credits_per_hour - a.credits_per_hour);
        break;
    }

    return result;
  }, [listings, searchQuery, filters, sortBy]);

  const clearFilters = () => {
    setFilters({
      categories: [],
      levels: [],
      maxCredits: 100,
      freeOnly: false
    });
  };

  const activeFiltersCount = filters.categories.length + filters.levels.length + (filters.maxCredits < 100 ? 1 : 0) + (filters.freeOnly ? 1 : 0);
  
  const profiles = useMemo(() => {
    return Object.values(profilesMap);
  },[profilesMap]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Skill Marketplace</h1>
              <p className="text-blue-100 text-lg">Discover skills to learn from our community</p>
            </div>
            <Link to={createPageUrl('CreateListing')}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Plus className="w-5 h-5 mr-2" />
                Offer Your Skill
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for skills, topics, or keywords..."
                className="pl-12 h-14 text-lg bg-white border-0 shadow-lg rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
            <div className="text-center">
              <p className="text-2xl font-bold">{listings.length}</p>
              <p className="text-sm text-blue-100">Skills Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-sm text-blue-100">Active Teachers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">10+</p>
              <p className="text-sm text-blue-100">Categories</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              onClear={clearFilters}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Button
                  variant={filters.freeOnly ? "default" : "outline"}
                  onClick={() => setFilters(prev => ({ ...prev, freeOnly: !prev.freeOnly }))}
                  className={filters.freeOnly ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {filters.freeOnly ? "Showing Free" : "Free Only"}
                </Button>
                
                {/* Mobile Filters */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="outline" className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge className="bg-blue-600 ml-1">{activeFiltersCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-4">
                      <FilterSidebar
                        filters={filters}
                        setFilters={setFilters}
                        onClear={clearFilters}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{filteredListings.length}</span> skills found
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="credits_low">Credits: Low to High</SelectItem>
                    <SelectItem value="credits_high">Credits: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-none ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-none ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-sm text-slate-500">Active filters:</span>
                {filters.categories.map(cat => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-slate-200"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      categories: prev.categories.filter(c => c !== cat)
                    }))}
                  >
                    {cat}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                {filters.levels.map(level => (
                  <Badge
                    key={level}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-slate-200"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      levels: prev.levels.filter(l => l !== level)
                    }))}
                  >
                    {level}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                {filters.maxCredits < 100 && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-slate-200"
                    onClick={() => setFilters(prev => ({ ...prev, maxCredits: 100 }))}
                  >
                    Max {filters.maxCredits} credits
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                {filters.freeOnly && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-slate-200 bg-green-100 text-green-700"
                    onClick={() => setFilters(prev => ({ ...prev, freeOnly: false }))}
                  >
                    Free only
                    <X className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            )}

            {/* Listings Grid */}
            {listingsLoading ? (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-md">
                    <Skeleton className="h-32 w-full rounded-xl mb-4" />
                    <Skeleton className="h-4 w-20 mb-3" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No skills found</h3>
                <p className="text-slate-600 mb-6">Try adjusting your filters or search terms</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                <AnimatePresence>
                  {filteredListings.map((listing, i) => (
                    <SkillCard
                      key={listing.id}
                      listing={listing}
                      profile={profilesMap[listing.user_id]}
                      index={i}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}