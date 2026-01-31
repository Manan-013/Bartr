import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Star,
  Calendar,
  MessageCircle,
  ChevronRight,
  MapPin,
  Languages,
  Award,
  BookOpen,
  FileVideo
} from "lucide-react";
import CourseContentViewer from "../components/course/CourseContentViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryColors = {
  technology: "bg-blue-100 text-blue-700",
  languages: "bg-emerald-100 text-emerald-700",
  music: "bg-teal-100 text-teal-700",
  art: "bg-cyan-100 text-cyan-700",
  business: "bg-amber-100 text-amber-700",
  fitness: "bg-rose-100 text-rose-700",
  cooking: "bg-orange-100 text-orange-700",
  crafts: "bg-teal-100 text-teal-700",
  academics: "bg-blue-100 text-blue-700",
  other: "bg-slate-100 text-slate-700"
};

export default function SkillDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestData, setRequestData] = useState({
    message: "",
    proposed_date: "",
    proposed_time: "",
    duration_hours: 1
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const listings = await base44.entities.SkillListing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId,
  });

  const { data: teacherProfile } = useQuery({
    queryKey: ['teacherProfile', listing?.user_id],
    queryFn: async () => {
      const profiles = await base44.entities.Profile.filter({ user_id: listing.user_id });
      return profiles[0];
    },
    enabled: !!listing?.user_id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['skillReviews', listingId],
    queryFn: () => base44.entities.Review.filter({ skill_listing_id: listingId }),
    enabled: !!listingId,
  });

  const { data: courseContents = [] } = useQuery({
    queryKey: ['courseContents', listingId],
    queryFn: () => base44.entities.CourseContent.filter({ skill_listing_id: listingId }),
    enabled: !!listingId,
  });

  const { data: acceptedSessions = [] } = useQuery({
    queryKey: ['acceptedSessions', user?.email, listingId],
    queryFn: async () => {
      const sessions = await base44.entities.Session.filter({ 
        learner_id: user.email,
        skill_listing_id: listingId 
      });
      return sessions;
    },
    enabled: !!user?.email && !!listingId,
  });

  const isOwnListing = user?.email === listing?.user_id;
  const hasAccessToContent = acceptedSessions.length > 0 || isOwnListing;

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.filter({ user_id: user.email });
      return wallets[0] || { balance: 0 };
    },
    enabled: !!user?.email,
  });

  const totalCredits = requestData.duration_hours * (listing?.credits_per_hour || 0);
  const isFree = listing?.credits_per_hour === 0;
  const hasEnoughCredits = isFree || (wallet?.balance || 0) >= totalCredits;

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      // Create session request
      const request = await base44.entities.SessionRequest.create({
        from_user_id: user.email,
        to_user_id: listing.user_id,
        skill_listing_id: listing.id,
        message: requestData.message,
        proposed_date: `${requestData.proposed_date}T${requestData.proposed_time}:00`,
        duration_hours: requestData.duration_hours,
        total_credits: totalCredits,
        status: "pending"
      });

      // Create notification for teacher
      await base44.entities.Notification.create({
        user_id: listing.user_id,
        type: "session_request",
        title: "New Session Request",
        message: `${user.full_name || user.email} wants to learn ${listing.title}`,
        link: `Requests`,
        related_user_id: user.email
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      setRequestDialogOpen(false);
      navigate(createPageUrl('Requests'));
    }
  });

  const handleSendRequest = () => {
    if (!hasEnoughCredits) return;
    sendRequestMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
        <div className="animate-pulse text-blue-600">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Skill not found</h2>
          <Link to={createPageUrl('Marketplace')}>
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Header Image */}
      {listing.cover_image && (
        <div className="h-64 md:h-80 w-full overflow-hidden">
          <img
            src={listing.cover_image}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={categoryColors[listing.category]}>
                  {listing.category}
                </Badge>
                <Badge variant="outline">{listing.level}</Badge>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">{listing.title}</h1>
              
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
                {teacherProfile?.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-slate-900">{teacherProfile.average_rating.toFixed(1)}</span>
                    <span>({reviews.length} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>{listing.total_sessions || 0} sessions</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>About This Skill</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{listing.description}</p>
                
                {listing.tags?.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-700 mb-2">Topics covered:</p>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Content */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="w-5 h-5 text-blue-600" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CourseContentViewer
                  contents={courseContents}
                  hasAccess={hasAccessToContent}
                  isTeacher={isOwnListing}
                />
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              {review.reviewer_id?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{review.reviewer_id}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-slate-600">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="shadow-lg border-0 sticky top-24">
              <CardContent className="p-6">
                {/* Price */}
                {listing.credits_per_hour === 0 ? (
                  <div className="flex items-center justify-center mb-6 py-6">
                    <Badge className="bg-green-600 text-white text-2xl px-8 py-3">FREE</Badge>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 mb-6 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">₿</span>
                    </div>
                    <span className="text-3xl font-bold text-slate-900">{listing.credits_per_hour}</span>
                    <span className="text-slate-500">/hour</span>
                  </div>
                )}

                {isOwnListing ? (
                  <div className="text-center text-slate-500 py-4">
                    This is your listing
                  </div>
                ) : (
                  <>
                    <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12 text-lg">
                          <Calendar className="w-5 h-5 mr-2" />
                          Request Session
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Request a Session</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Date</Label>
                              <Input
                                type="date"
                                value={requestData.proposed_date}
                                onChange={(e) => setRequestData(prev => ({ ...prev, proposed_date: e.target.value }))}
                                className="mt-1"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <Label>Time</Label>
                              <Input
                                type="time"
                                value={requestData.proposed_time}
                                onChange={(e) => setRequestData(prev => ({ ...prev, proposed_time: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Duration</Label>
                            <Select
                              value={requestData.duration_hours.toString()}
                              onValueChange={(value) => setRequestData(prev => ({ ...prev, duration_hours: parseInt(value) }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 hour</SelectItem>
                                <SelectItem value="2">2 hours</SelectItem>
                                <SelectItem value="3">3 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Message to Teacher</Label>
                            <Textarea
                              value={requestData.message}
                              onChange={(e) => setRequestData(prev => ({ ...prev, message: e.target.value }))}
                              placeholder="Introduce yourself and what you'd like to learn..."
                              className="mt-1 h-24"
                            />
                          </div>

                          <div className="p-4 bg-slate-50 rounded-lg">
                            {isFree ? (
                              <div className="text-center py-4">
                                <Badge className="bg-green-600 text-white text-lg px-6 py-2 mb-2">FREE SESSION</Badge>
                                <p className="text-sm text-slate-600">No credits required</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-slate-600">Session cost</span>
                                  <span className="font-medium">{listing.credits_per_hour} × {requestData.duration_hours}hr</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                  <span>Total</span>
                                  <span className="text-violet-600">{totalCredits} credits</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                  <span className="text-slate-500">Your balance</span>
                                  <span className={hasEnoughCredits ? 'text-green-600' : 'text-red-600'}>
                                    {wallet?.balance || 0} credits
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {!isFree && !hasEnoughCredits && (
                            <p className="text-sm text-red-500">
                              Insufficient credits. <Link to={createPageUrl('Wallet')} className="underline">Add more credits</Link>
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSendRequest}
                            disabled={!hasEnoughCredits || !requestData.proposed_date || !requestData.proposed_time || sendRequestMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {sendRequestMutation.isPending ? 'Sending...' : 'Send Request'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Link to={createPageUrl('Messages') + `?userId=${listing.user_id}`}>
                      <Button variant="outline" className="w-full mt-3">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message Teacher
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Teacher Card */}
            <Card className="shadow-md border-0">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-4">TAUGHT BY</p>
                <Link to={createPageUrl('Profile') + `?username=${teacherProfile?.username}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-14 w-14 border-2 border-white shadow-md">
                      <AvatarImage src={teacherProfile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-lg">
                        {teacherProfile?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                        {teacherProfile?.username || 'Anonymous'}
                      </p>
                      {teacherProfile?.average_rating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>{teacherProfile.average_rating.toFixed(1)}</span>
                          <span className="text-slate-500">({teacherProfile.total_reviews} reviews)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {teacherProfile?.bio && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">{teacherProfile.bio}</p>
                )}

                <div className="space-y-2 text-sm">
                  {teacherProfile?.languages?.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Languages className="w-4 h-4" />
                      <span>{teacherProfile.languages.join(', ')}</span>
                    </div>
                  )}
                  {teacherProfile?.timezone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{teacherProfile.timezone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <Award className="w-4 h-4" />
                    <span>{teacherProfile?.total_sessions_taught || 0} sessions taught</span>
                  </div>
                </div>

                <Link to={createPageUrl('Profile') + `?username=${teacherProfile?.username}`}>
                  <Button variant="outline" className="w-full mt-4">
                    View Full Profile
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}