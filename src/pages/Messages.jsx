import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Send,
  ArrowLeft,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Messages() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const initialUserId = urlParams.get('userId');

  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: threads = [], isLoading: loadingThreads } = useQuery({
    queryKey: ['chatThreads', user?.email],
    queryFn: () => base44.entities.ChatThread.filter({ participant_emails: user.email }, '-last_message_at'),
    enabled: !!user?.email,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.Profile.list(),
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedThread?.id],
    queryFn: () => base44.entities.Message.filter({ thread_id: selectedThread.id }, 'created_date'),
    enabled: !!selectedThread?.id,
    refetchInterval: 3000, // Poll for new messages
  });

  const profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});

  // Handle initial userId param - create or find thread
  useEffect(() => {
    if (initialUserId && user?.email && threads.length >= 0) {
      const existingThread = threads.find(t => 
        t.participant_emails?.includes(initialUserId) && t.participant_emails?.includes(user.email)
      );
      
      if (existingThread) {
        setSelectedThread(existingThread);
      } else if (initialUserId !== user.email) {
        // Create new thread
        createThreadMutation.mutate(initialUserId);
      }
    }
  }, [initialUserId, user?.email, threads]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (selectedThread && user?.email) {
      const userIdx = selectedThread.participant_emails?.indexOf(user.email);
      const unreadField = userIdx === 0 ? 'unread_count_user1' : 'unread_count_user2';
      
      if (selectedThread[unreadField] > 0) {
        base44.entities.ChatThread.update(selectedThread.id, { [unreadField]: 0 });
        queryClient.invalidateQueries(['chatThreads']);
        queryClient.invalidateQueries(['unreadMessages']);
      }
    }
  }, [selectedThread, user?.email]);

  const createThreadMutation = useMutation({
    mutationFn: async (otherUserId) => {
      const thread = await base44.entities.ChatThread.create({
        participant_ids: [user.email, otherUserId],
        participant_emails: [user.email, otherUserId],
        unread_count_user1: 0,
        unread_count_user2: 0
      });
      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries(['chatThreads']);
      setSelectedThread(thread);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const message = await base44.entities.Message.create({
        thread_id: selectedThread.id,
        sender_id: user.email,
        sender_email: user.email,
        content,
        message_type: 'text',
        is_read: false
      });

      // Update thread
      const userIdx = selectedThread.participant_emails?.indexOf(user.email);
      const otherUserUnreadField = userIdx === 0 ? 'unread_count_user2' : 'unread_count_user1';
      
      await base44.entities.ChatThread.update(selectedThread.id, {
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_message_sender_id: user.email,
        [otherUserUnreadField]: (selectedThread[otherUserUnreadField] || 0) + 1
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedThread?.id]);
      queryClient.invalidateQueries(['chatThreads']);
      setNewMessage("");
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const getOtherUser = (thread) => {
    const otherEmail = thread.participant_emails?.find(e => e !== user?.email);
    return profilesMap[otherEmail] || { username: otherEmail, user_id: otherEmail };
  };

  const getUnreadCount = (thread) => {
    const userIdx = thread.participant_emails?.indexOf(user?.email);
    return userIdx === 0 ? thread.unread_count_user1 : thread.unread_count_user2;
  };

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery.trim()) return true;
    const otherUser = getOtherUser(thread);
    return otherUser.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <div className="max-w-6xl mx-auto h-full">
        <div className="flex h-full bg-white shadow-xl rounded-none md:rounded-2xl md:my-4 md:mx-4 overflow-hidden">
          {/* Sidebar - Thread List */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Thread List */}
            <ScrollArea className="flex-1">
              {loadingThreads ? (
                <div className="p-4 text-center text-slate-500">Loading...</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No conversations yet</p>
                  <p className="text-sm text-slate-400 mt-1">Start a conversation from someone's profile</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredThreads.map((thread) => {
                    const otherUser = getOtherUser(thread);
                    const unreadCount = getUnreadCount(thread);
                    const isSelected = selectedThread?.id === thread.id;

                    return (
                      <div
                        key={thread.id}
                        onClick={() => setSelectedThread(thread)}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-violet-50 border-l-4 border-violet-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={otherUser.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                              {otherUser.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-900 truncate">
                                {otherUser.username || otherUser.user_id}
                              </p>
                              {thread.last_message_at && (
                                <span className="text-xs text-slate-400">
                                  {format(new Date(thread.last_message_at), 'MMM d')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-slate-500 truncate">
                                {thread.last_message || 'No messages yet'}
                              </p>
                              {unreadCount > 0 && (
                                <Badge className="bg-violet-600 ml-2">{unreadCount}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedThread ? 'hidden md:flex' : 'flex'}`}>
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">Choose from your existing chats or start a new one</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedThread(null)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Link to={createPageUrl('Profile') + `?username=${getOtherUser(selectedThread).username}`}>
                      <div className="flex items-center gap-3 hover:opacity-80">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getOtherUser(selectedThread).avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                            {getOtherUser(selectedThread).username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {getOtherUser(selectedThread).username || getOtherUser(selectedThread).user_id}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="text-center text-slate-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Say hello to start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {messages.map((message, i) => {
                          const isMine = message.sender_id === user?.email;
                          const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender_id !== message.sender_id);

                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>
                                {showAvatar && !isMine && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={getOtherUser(selectedThread).avatar_url} />
                                    <AvatarFallback className="bg-violet-100 text-violet-600 text-xs">
                                      {getOtherUser(selectedThread).username?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                {!showAvatar && !isMine && <div className="w-8" />}
                                <div
                                  className={`px-4 py-2 rounded-2xl ${
                                    isMine
                                      ? 'bg-violet-600 text-white rounded-br-md'
                                      : 'bg-slate-100 text-slate-900 rounded-bl-md'
                                  }`}
                                >
                                  <p>{message.content}</p>
                                  <p className={`text-xs mt-1 ${isMine ? 'text-violet-200' : 'text-slate-400'}`}>
                                    {format(new Date(message.created_date), 'h:mm a')}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}