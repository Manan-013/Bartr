import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isFuture, isToday } from "date-fns";
import { motion } from "framer-motion";
import {
  Video,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageCircle,
  Play,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const statusConfig = {
  scheduled: { color: "bg-blue-100 text-blue-700", icon: Calendar },
  in_progress: { color: "bg-green-100 text-green-700", icon: Play },
  completed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { color: "bg-slate-100 text-slate-600", icon: XCircle },
  no_show: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-amber-100 text-amber-700", icon: AlertCircle }
};

export default function Sessions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['userSessions', user?.email],
    queryFn: async () => {
      const asTea = await base44.entities.Session.filter({ teacher_id: user.email });
      const asLea = await base44.entities.Session.filter({ learner_id: user.email });
      return [...asTea, ...asLea].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    },
    enabled: !!user?.email,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.Profile.list(),
  });

  const { data: existingReviews = [] } = useQuery({
    queryKey: ['myReviews', user?.email],
    queryFn: () => base44.entities.Review.filter({ reviewer_id: user.email }),
    enabled: !!user?.email,
  });

  const profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
  const reviewedSessionIds = existingReviews.map(r => r.session_id);

  const upcomingSessions = sessions.filter(s => 
    ['scheduled', 'in_progress'].includes(s.status) && isFuture(new Date(s.scheduled_date))
  );

  const pastSessions = sessions.filter(s => 
    s.status === 'completed' || isPast(new Date(s.scheduled_date))
  );

  const todaySessions = sessions.filter(s => 
    ['scheduled', 'in_progress'].includes(s.status) && isToday(new Date(s.scheduled_date))
  );

  const submitReviewMutation = useMutation({
    mutationFn: async ({ session, rating, comment }) => {
      const isTeacher = session.teacher_id === user.email;
      const reviewedUserId = isTeacher ? session.learner_id : session.teacher_id;

      await base44.entities.Review.create({
        session_id: session.id,
        reviewer_id: user.email,
        reviewed_user_id: reviewedUserId,
        skill_listing_id: session.skill_listing_id,
        rating,
        comment,
        review_type: isTeacher ? 'as_teacher' : 'as_learner'
      });

      // Update profile rating
      const userReviews = await base44.entities.Review.filter({ reviewed_user_id: reviewedUserId });
      const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
      
      const profileToUpdate = profilesMap[reviewedUserId];
      if (profileToUpdate) {
        await base44.entities.Profile.update(profileToUpdate.id, {
          average_rating: avgRating,
          total_reviews: userReviews.length
        });
      }

      // Notify
      await base44.entities.Notification.create({
        user_id: reviewedUserId,
        type: 'new_review',
        title: 'New Review Received',
        message: `You received a ${rating}-star review!`,
        link: 'Profile'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myReviews']);
      queryClient.invalidateQueries(['allProfiles']);
      setReviewDialog(null);
      setReviewData({ rating: 5, comment: "" });
    }
  });

  const startSessionMutation = useMutation({
    mutationFn: async (session) => {
      await base44.entities.Session.update(session.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSessions']);
    }
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async ({ session, reason }) => {
      await base44.entities.Session.update(session.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_user_id: user.email,
        cancel_reason: reason
      });

      // Notify the other participant
      const otherUserId = session.teacher_id === user.email ? session.learner_id : session.teacher_id;
      await base44.entities.Notification.create({
        user_id: otherUserId,
        type: 'session_cancelled',
        title: 'Session Cancelled',
        message: `Your session for ${session.skill_title} has been cancelled. Reason: ${reason || 'No reason provided'}`,
        link: 'Sessions'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSessions']);
      setCancelDialog(null);
      setCancelReason("");
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (session) => {
      // Mark session complete
      await base44.entities.Session.update(session.id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        credits_transferred: true
      });

      // Transfer credits only if not free
      if (session.credits_amount > 0) {
        const teacherWallets = await base44.entities.Wallet.filter({ user_id: session.teacher_id });
        const learnerWallets = await base44.entities.Wallet.filter({ user_id: session.learner_id });

        if (teacherWallets[0]) {
          await base44.entities.Wallet.update(teacherWallets[0].id, {
            balance: (teacherWallets[0].balance || 0) + session.credits_amount,
            total_earned: (teacherWallets[0].total_earned || 0) + session.credits_amount
          });
        }

        if (learnerWallets[0]) {
          await base44.entities.Wallet.update(learnerWallets[0].id, {
            balance: (learnerWallets[0].balance || 0) - session.credits_amount,
            total_spent: (learnerWallets[0].total_spent || 0) + session.credits_amount
          });
        }

        // Credit transactions
        await base44.entities.CreditTransaction.create({
          user_id: session.teacher_id,
          type: 'earned',
          amount: session.credits_amount,
          description: `Earned from teaching: ${session.skill_title}`,
          related_session_id: session.id,
          related_user_id: session.learner_id
        });

        await base44.entities.CreditTransaction.create({
          user_id: session.learner_id,
          type: 'spent',
          amount: -session.credits_amount,
          description: `Spent on learning: ${session.skill_title}`,
          related_session_id: session.id,
          related_user_id: session.teacher_id
        });
      }

      // Update profile stats
      const teacherProfile = profilesMap[session.teacher_id];
      const learnerProfile = profilesMap[session.learner_id];

      if (teacherProfile) {
        await base44.entities.Profile.update(teacherProfile.id, {
          total_sessions_taught: (teacherProfile.total_sessions_taught || 0) + 1
        });
      }

      if (learnerProfile) {
        await base44.entities.Profile.update(learnerProfile.id, {
          total_sessions_learned: (learnerProfile.total_sessions_learned || 0) + 1
        });
      }

      // Notifications
      await base44.entities.Notification.create({
        user_id: session.teacher_id,
        type: 'credits_received',
        title: 'Credits Received',
        message: `You earned ${session.credits_amount} credits for teaching ${session.skill_title}`,
        link: 'Wallet'
      });

      await base44.entities.Notification.create({
        user_id: session.learner_id,
        type: 'session_completed',
        title: 'Session Completed',
        message: `Your session for ${session.skill_title} is complete. Don't forget to leave a review!`,
        link: 'Sessions'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSessions']);
      queryClient.invalidateQueries(['wallet']);
      queryClient.invalidateQueries(['allProfiles']);
    }
  });

  const renderSessionCard = (session) => {
    const isTeacher = session.teacher_id === user?.email;
    const otherUserId = isTeacher ? session.learner_id : session.teacher_id;
    const otherProfile = profilesMap[otherUserId];
    const StatusIcon = statusConfig[session.status]?.icon || Calendar;
    const canReview = session.status === 'completed' && !reviewedSessionIds.includes(session.id);
    const canStart = session.status === 'scheduled' && isTeacher && 
      (isToday(new Date(session.scheduled_date)) || isPast(new Date(session.scheduled_date)));
    const canComplete = session.status === 'in_progress' && isTeacher;
    const canCancel = ['scheduled', 'in_progress'].includes(session.status);

    return (
      <motion.div
        key={session.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-md border-0 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={otherProfile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                    {otherProfile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{session.skill_title}</h3>
                    <Badge className={statusConfig[session.status]?.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {session.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {isTeacher ? 'Teaching' : 'Learning from'}{' '}
                    <Link
                      to={createPageUrl('Profile') + `?username=${otherProfile?.username}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {otherProfile?.username || otherUserId}
                    </Link>
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(session.scheduled_date), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(session.scheduled_date), 'h:mm a')}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-amber-600">{session.credits_amount} credits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {canStart && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => startSessionMutation.mutate(session)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start Session
                  </Button>
                )}
                {session.status === 'in_progress' && (
                  <Link to={createPageUrl('VideoCall') + `?sessionId=${session.id}`}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Video className="w-4 h-4 mr-1" />
                      Join Call
                    </Button>
                  </Link>
                )}
                {canComplete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeSessionMutation.mutate(session)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
                {canReview && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewDialog(session)}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Leave Review
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setCancelDialog(session)}
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                )}
                <Link to={createPageUrl('Messages') + `?userId=${otherUserId}`}>
                  <Button size="sm" variant="ghost">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Sessions</h1>
          <p className="text-slate-600 mt-1">View and manage your learning and teaching sessions</p>
        </div>

        {/* Today's Sessions Alert */}
        {todaySessions.length > 0 && (
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">You have {todaySessions.length} session(s) today!</h3>
                  <p className="text-blue-100">
                    {todaySessions.map(s => format(new Date(s.scheduled_date), 'h:mm a')).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm mb-6">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastSessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : upcomingSessions.length === 0 ? (
              <Card className="shadow-md border-0">
                <CardContent className="py-16 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No upcoming sessions</h3>
                  <p className="text-slate-500 mb-4">Browse the marketplace to find skills to learn!</p>
                  <Link to={createPageUrl('Marketplace')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Browse Marketplace
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map(renderSessionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastSessions.length === 0 ? (
              <Card className="shadow-md border-0">
                <CardContent className="py-16 text-center">
                  <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No past sessions</h3>
                  <p className="text-slate-500">Your completed sessions will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastSessions.map(renderSessionCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Dialog */}
        <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-slate-600">
                Are you sure you want to cancel this session? The other participant will be notified.
              </p>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let them know why you're cancelling..."
                  className="mt-1 h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialog(null)}>Keep Session</Button>
              <Button
                variant="destructive"
                onClick={() => cancelSessionMutation.mutate({ session: cancelDialog, reason: cancelReason })}
                disabled={cancelSessionMutation.isPending}
              >
                {cancelSessionMutation.isPending ? 'Cancelling...' : 'Cancel Session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave a Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= reviewData.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Comment (optional)</Label>
                <Textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience..."
                  className="mt-1 h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => submitReviewMutation.mutate({
                  session: reviewDialog,
                  rating: reviewData.rating,
                  comment: reviewData.comment
                })}
                disabled={submitReviewMutation.isPending}
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}