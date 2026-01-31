import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MessageCircle,
  Settings,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function VideoCall() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [endCallDialog, setEndCallDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.Session.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.Profile.list(),
  });

  const profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setEndCallDialog(false);
    navigate(createPageUrl('Sessions'));
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading session...</div>
      </div>
    );
  }

  const isTeacher = session.teacher_id === user?.email;
  const otherUserId = isTeacher ? session.learner_id : session.teacher_id;
  const otherProfile = profilesMap[otherUserId];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">{session.skill_title}</span>
          </div>
          <Badge variant="secondary" className="bg-slate-700 text-white">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(callDuration)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white">
            {isTeacher ? 'Teaching' : 'Learning'}
          </Badge>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative p-4">
        {/* Remote Video (Large) */}
        <div className="absolute inset-4 bg-slate-800 rounded-2xl overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-slate-600">
                <AvatarImage src={otherProfile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-4xl">
                  {otherProfile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-white text-xl font-medium">{otherProfile?.username || otherUserId}</p>
              <p className="text-slate-400 text-sm mt-1">
                {isVideoOn ? 'Video is enabled' : 'Video is off'}
              </p>
            </div>
          </div>
        </div>

        {/* Local Video (Small) */}
        <div className="absolute bottom-8 right-8 w-48 h-36 bg-slate-700 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-600">
          <div className="w-full h-full flex items-center justify-center">
            {isVideoOn ? (
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto">
                  <AvatarImage src={profilesMap[user?.email]?.avatar_url} />
                  <AvatarFallback className="bg-violet-600 text-white">
                    {user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-xs mt-2">You</p>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">
                <VideoOff className="w-8 h-8 mx-auto mb-1" />
                Camera off
              </div>
            )}
          </div>
        </div>

        {/* Session Info */}
        <div className="absolute top-8 left-8">
          <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 text-white">
            <CardContent className="p-4">
              <p className="text-sm text-slate-400">Session Duration</p>
              <p className="font-medium">{session.duration_hours} hour(s)</p>
              <p className="text-sm text-slate-400 mt-2">Credits</p>
              <p className="font-medium text-amber-400">{session.credits_amount} credits</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-6 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full w-14 h-14 ${isMicOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'} text-white`}
            onClick={() => setIsMicOn(!isMicOn)}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full w-14 h-14 ${isVideoOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'} text-white`}
            onClick={() => setIsVideoOn(!isVideoOn)}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="rounded-full w-14 h-14 bg-slate-700 hover:bg-slate-600 text-white"
          >
            <Monitor className="w-6 h-6" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
            onClick={() => setEndCallDialog(true)}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="rounded-full w-14 h-14 bg-slate-700 hover:bg-slate-600 text-white"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="rounded-full w-14 h-14 bg-slate-700 hover:bg-slate-600 text-white"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* End Call Dialog */}
      <AlertDialog open={endCallDialog} onOpenChange={setEndCallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this call? If you're the teacher, you can mark the session as complete from the Sessions page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Call</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndCall} className="bg-red-600 hover:bg-red-700">
              End Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}