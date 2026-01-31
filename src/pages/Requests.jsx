import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Check,
  X,
  Inbox,
  Send
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  counter_proposed: "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-700",
  expired: "bg-slate-100 text-slate-500"
};

export default function Requests() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("received");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [counterProposalDate, setCounterProposalDate] = useState("");
  const [counterProposalTime, setCounterProposalTime] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [actionDialog, setActionDialog] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: receivedRequests = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['receivedRequests', user?.email],
    queryFn: () => base44.entities.SessionRequest.filter({ to_user_id: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: sentRequests = [], isLoading: loadingSent } = useQuery({
    queryKey: ['sentRequests', user?.email],
    queryFn: () => base44.entities.SessionRequest.filter({ from_user_id: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.Profile.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['allListings'],
    queryFn: () => base44.entities.SkillListing.list(),
  });

  const profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
  const listingsMap = listings.reduce((acc, l) => ({ ...acc, [l.id]: l }), {});

  const acceptMutation = useMutation({
    mutationFn: async (request) => {
      // Update request status
      await base44.entities.SessionRequest.update(request.id, { status: 'accepted' });

      // Create session
      const session = await base44.entities.Session.create({
        request_id: request.id,
        teacher_id: request.to_user_id,
        learner_id: request.from_user_id,
        skill_listing_id: request.skill_listing_id,
        skill_title: listingsMap[request.skill_listing_id]?.title || 'Unknown Skill',
        scheduled_date: request.proposed_date,
        duration_hours: request.duration_hours,
        credits_amount: request.total_credits,
        status: 'scheduled',
        room_id: `room_${Date.now()}`
      });

      // Notify the requester
      await base44.entities.Notification.create({
        user_id: request.from_user_id,
        type: 'request_accepted',
        title: 'Session Request Accepted!',
        message: `Your session request has been accepted. Get ready to learn!`,
        link: 'Sessions',
        related_session_id: session.id
      });

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['receivedRequests']);
      queryClient.invalidateQueries(['sessions']);
      setActionDialog(null);
      setSelectedRequest(null);
    }
  });

  const declineMutation = useMutation({
    mutationFn: async ({ request, reason }) => {
      await base44.entities.SessionRequest.update(request.id, {
        status: 'declined',
        decline_reason: reason
      });

      await base44.entities.Notification.create({
        user_id: request.from_user_id,
        type: 'request_declined',
        title: 'Session Request Declined',
        message: reason || 'Your session request was declined.',
        link: 'Requests'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['receivedRequests']);
      setActionDialog(null);
      setSelectedRequest(null);
      setDeclineReason("");
    }
  });

  const counterProposeMutation = useMutation({
    mutationFn: async ({ request, newDate, newTime }) => {
      const newDateTime = `${newDate}T${newTime}:00`;
      
      await base44.entities.SessionRequest.update(request.id, {
        status: 'counter_proposed',
        counter_proposed_date: newDateTime
      });

      await base44.entities.Notification.create({
        user_id: request.from_user_id,
        type: 'session_request',
        title: 'New Time Proposed',
        message: `A new time has been proposed for your session request.`,
        link: 'Requests'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['receivedRequests']);
      setActionDialog(null);
      setSelectedRequest(null);
      setCounterProposalDate("");
      setCounterProposalTime("");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (request) => {
      await base44.entities.SessionRequest.update(request.id, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sentRequests']);
    }
  });

  const renderRequestCard = (request, type) => {
    const otherUserId = type === 'received' ? request.from_user_id : request.to_user_id;
    const otherProfile = profilesMap[otherUserId];
    const listing = listingsMap[request.skill_listing_id];

    return (
      <motion.div
        key={request.id}
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
                    <Link
                      to={createPageUrl('Profile') + `?username=${otherProfile?.username}`}
                      className="font-semibold text-slate-900 hover:text-blue-600"
                    >
                      {otherProfile?.username || otherUserId}
                    </Link>
                    <Badge className={statusColors[request.status]}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {type === 'received' ? 'wants to learn' : 'requested'}{' '}
                    <span className="font-medium text-blue-600">{listing?.title || 'Unknown Skill'}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(request.proposed_date), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(request.proposed_date), 'h:mm a')}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-amber-600">{request.total_credits} credits</span>
                    </div>
                  </div>
                  {request.message && (
                    <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      "{request.message}"
                    </p>
                  )}
                  {request.status === 'counter_proposed' && request.counter_proposed_date && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">Counter Proposal:</p>
                      <p className="text-sm text-blue-600">
                        {format(new Date(request.counter_proposed_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {request.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  {type === 'received' ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionDialog('accept');
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionDialog('counter');
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Propose New Time
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionDialog('decline');
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => cancelMutation.mutate(request)}
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>
              )}

              {request.status === 'counter_proposed' && type === 'sent' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => acceptMutation.mutate(request)}
                  >
                    Accept New Time
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => cancelMutation.mutate(request)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
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
          <h1 className="text-3xl font-bold text-slate-900">Session Requests</h1>
          <p className="text-slate-600 mt-1">Manage your incoming and outgoing session requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm mb-6">
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Received
              {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="bg-blue-600 ml-1">
                  {receivedRequests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            {loadingReceived ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : receivedRequests.length === 0 ? (
              <Card className="shadow-md border-0">
                <CardContent className="py-16 text-center">
                  <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No requests yet</h3>
                  <p className="text-slate-500">When someone wants to learn from you, their requests will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {receivedRequests.map(request => renderRequestCard(request, 'received'))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {loadingSent ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : sentRequests.length === 0 ? (
              <Card className="shadow-md border-0">
                <CardContent className="py-16 text-center">
                  <Send className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No requests sent</h3>
                  <p className="text-slate-500 mb-4">Start learning by browsing skills in the marketplace.</p>
                  <Link to={createPageUrl('Marketplace')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Browse Marketplace
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {sentRequests.map(request => renderRequestCard(request, 'sent'))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Accept Dialog */}
        <Dialog open={actionDialog === 'accept'} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Session Request</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              Are you sure you want to accept this session? A session will be created and the learner will be notified.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => acceptMutation.mutate(selectedRequest)}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? 'Accepting...' : 'Confirm Accept'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Dialog */}
        <Dialog open={actionDialog === 'decline'} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Request</DialogTitle>
            </DialogHeader>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Let them know why you're declining..."
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => declineMutation.mutate({ request: selectedRequest, reason: declineReason })}
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Counter Proposal Dialog */}
        <Dialog open={actionDialog === 'counter'} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Propose New Time</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Date</Label>
                <Input
                  type="date"
                  value={counterProposalDate}
                  onChange={(e) => setCounterProposalDate(e.target.value)}
                  className="mt-1"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={counterProposalTime}
                  onChange={(e) => setCounterProposalTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => counterProposeMutation.mutate({
                  request: selectedRequest,
                  newDate: counterProposalDate,
                  newTime: counterProposalTime
                })}
                disabled={!counterProposalDate || !counterProposalTime || counterProposeMutation.isPending}
              >
                {counterProposeMutation.isPending ? 'Sending...' : 'Send Proposal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}