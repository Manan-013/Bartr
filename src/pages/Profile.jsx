import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  Calendar,
  MapPin,
  Languages,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Settings,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import SkillCard from "../components/marketplace/SkillCard";

export default function Profile() {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('username');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['viewProfile', username],
    queryFn: async () => {
      if (!username) {
        // Show current user's profile
        const profiles = await base44.entities.Profile.filter({ user_id: currentUser?.email });
        return profiles[0];
      }
      const profiles = await base44.entities.Profile.filter({ username });
      return profiles[0];
    },
    enabled: !!username || !!currentUser?.email,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['userListings', profile?.user_id],
    queryFn: () => base44.entities.SkillListing.filter({ user_id: profile.user_id, is_active: true }),
    enabled: !!profile?.user_id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['userReviews', profile?.user_id],
    queryFn: () => base44.entities.Review.filter({ reviewed_user_id: profile.user_id }),
    enabled: !!profile?.user_id,
  });

  const isOwnProfile = currentUser?.email === profile?.user_id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
        <div className="animate-pulse text-blue-600">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile not found</h2>
          <Link to={createPageUrl('Marketplace')}>
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-48 md:h-56" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-0 overflow-visible">
              <CardContent className="p-6">
                <div className="flex flex-col items-center -mt-20">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-4xl">
                      {profile.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <h1 className="text-2xl font-bold text-slate-900 mt-4">{profile.username}</h1>
                  
                  {profile.average_rating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{profile.average_rating.toFixed(1)}</span>
                      <span className="text-slate-500">({profile.total_reviews} reviews)</span>
                    </div>
                  )}

                  {profile.is_verified && (
                    <Badge className="mt-2 bg-green-100 text-green-700">Verified</Badge>
                  )}
                </div>

                <Separator className="my-6" />

                {profile.bio && (
                  <p className="text-slate-600 text-center mb-6">{profile.bio}</p>
                )}

                <div className="space-y-3">
                  {profile.languages?.length > 0 && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <Languages className="w-5 h-5 text-slate-400" />
                      <span>{profile.languages.join(', ')}</span>
                    </div>
                  )}
                  {profile.timezone && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <span>{profile.timezone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-slate-600">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <span>Member since {new Date(profile.created_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{profile.total_sessions_taught || 0}</p>
                    <p className="text-xs text-slate-500">Sessions Taught</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <p className="text-2xl font-bold text-teal-600">{profile.total_sessions_learned || 0}</p>
                    <p className="text-xs text-slate-500">Sessions Learned</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  {isOwnProfile ? (
                    <Link to={createPageUrl('Settings')}>
                      <Button variant="outline" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to={createPageUrl('Messages') + `?userId=${profile.user_id}`}>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Send Message
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills */}
            <div className="space-y-4">
              {/* Skills to Teach */}
              {profile.skills_to_teach?.length > 0 && (
                <Card className="shadow-md border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Skills I Teach
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills_to_teach.map((skill, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skills to Learn */}
              {profile.skills_to_learn?.length > 0 && (
                <Card className="shadow-md border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-teal-600" />
                      Skills I Want to Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills_to_learn.map((skill, i) => (
                        <Badge key={i} variant="outline" className="border-teal-200 text-teal-700">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="listings" className="space-y-6">
              <TabsList className="bg-white shadow-sm">
                <TabsTrigger value="listings">Skill Listings ({listings.length})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>

              <TabsContent value="listings">
                {listings.length === 0 ? (
                  <Card className="shadow-md border-0">
                    <CardContent className="py-12 text-center">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No skill listings yet</p>
                      {isOwnProfile && (
                        <Link to={createPageUrl('CreateListing')}>
                          <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                            Create Your First Listing
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((listing, i) => (
                      <SkillCard key={listing.id} listing={listing} profile={profile} index={i} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews">
                {reviews.length === 0 ? (
                  <Card className="shadow-md border-0">
                    <CardContent className="py-12 text-center">
                      <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No reviews yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-md border-0">
                    <CardContent className="p-6 space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                                  {review.reviewer_id?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{review.reviewer_id}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-slate-600 text-sm">{review.comment}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {new Date(review.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="availability">
                <Card className="shadow-md border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Weekly Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.availability?.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No availability set</p>
                    ) : (
                      <div className="space-y-3">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const daySlots = profile.availability?.filter(a => a.day === day) || [];
                          if (daySlots.length === 0) return null;
                          
                          return (
                            <div key={day} className="flex items-center gap-4">
                              <span className="w-24 font-medium text-slate-700">{day}</span>
                              <div className="flex flex-wrap gap-2">
                                {daySlots.map((slot, i) => (
                                  <Badge key={i} variant="secondary" className="bg-green-50 text-green-700">
                                    {slot.start_time}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}