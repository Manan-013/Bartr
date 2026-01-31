import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  BookOpen,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Users,
  Clock,
  FileVideo,
  FileText,
  Upload,
  AlertTriangle,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function MyCourses() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [contentForm, setContentForm] = useState({
    type: 'VIDEO',
    title: '',
    description: '',
    file_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['myListings', user?.email],
    queryFn: async () => {
      const all = await base44.entities.SkillListing.filter({ user_id: user.email });
      return all.filter(l => !l.is_deleted);
    },
    enabled: !!user?.email,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['teacherSessions', user?.email],
    queryFn: () => base44.entities.Session.filter({ teacher_id: user.email }),
    enabled: !!user?.email,
  });

  const { data: courseContents = [] } = useQuery({
    queryKey: ['allCourseContents'],
    queryFn: () => base44.entities.CourseContent.list(),
  });

  // Check for active sessions per listing
  const getActiveSessionsCount = (listingId) => {
    return sessions.filter(s => 
      s.skill_listing_id === listingId && 
      ['scheduled', 'in_progress'].includes(s.status)
    ).length;
  };

  const canDeleteListing = (listingId) => {
    return getActiveSessionsCount(listingId) === 0;
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async (listing) => {
      await base44.entities.SkillListing.update(listing.id, {
        is_active: !listing.is_active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myListings']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (listing) => {
      await base44.entities.SkillListing.update(listing.id, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_active: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myListings']);
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    }
  });

  const handleDeleteClick = (listing) => {
    if (!canDeleteListing(listing.id)) return;
    setListingToDelete(listing);
    setDeleteDialogOpen(true);
  };

  const handleUploadContent = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setContentForm(prev => ({ ...prev, file_url }));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const addContentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CourseContent.create({
        skill_listing_id: selectedListing.id,
        type: contentForm.type,
        title: contentForm.title,
        description: contentForm.description,
        file_url: contentForm.file_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCourseContents']);
      setContentDialogOpen(false);
      setContentForm({ type: 'VIDEO', title: '', description: '', file_url: '' });
    }
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId) => {
      await base44.entities.CourseContent.delete(contentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCourseContents']);
    }
  });

  const activeListings = listings.filter(l => l.is_active);
  const inactiveListings = listings.filter(l => !l.is_active);

  const renderListingCard = (listing) => {
    const activeSessions = getActiveSessionsCount(listing.id);
    const contents = courseContents.filter(c => c.skill_listing_id === listing.id);
    const canDelete = canDeleteListing(listing.id);

    return (
      <motion.div
        key={listing.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-md border-0 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={categoryColors[listing.category]}>
                    {listing.category}
                  </Badge>
                  <Badge variant="outline">{listing.level}</Badge>
                  {!listing.is_active && (
                    <Badge variant="secondary" className="bg-slate-200">Inactive</Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg text-slate-900 mb-2">
                  {listing.title}
                </h3>
                
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {listing.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {listing.total_sessions || 0} sessions
                  </div>
                  {listing.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {listing.average_rating.toFixed(1)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {listing.credits_per_hour === 0 ? (
                      <Badge className="bg-emerald-600 text-white">FREE</Badge>
                    ) : (
                      <span className="font-medium text-amber-600">{listing.credits_per_hour} credits/hr</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileVideo className="w-4 h-4" />
                    {contents.length} content items
                  </div>
                </div>

                {activeSessions > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                    <Clock className="w-4 h-4" />
                    {activeSessions} active session(s)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedListing(listing);
                    setContentDialogOpen(true);
                  }}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Content
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('SkillDetails') + `?id=${listing.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Listing
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('EditListing') + `?id=${listing.id}`}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleActiveMutation.mutate(listing)}>
                      {listing.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(listing)}
                      disabled={!canDelete}
                      className={canDelete ? "text-rose-600" : "text-slate-400 cursor-not-allowed"}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                      {!canDelete && (
                        <span className="ml-2 text-xs">(has active sessions)</span>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Course Content Preview */}
            {contents.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-slate-700 mb-2">Course Content:</p>
                <div className="flex flex-wrap gap-2">
                  {contents.slice(0, 3).map((content) => (
                    <Badge key={content.id} variant="secondary" className="flex items-center gap-1">
                      {content.type === 'VIDEO' ? (
                        <FileVideo className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      {content.title}
                      <button
                        onClick={() => deleteContentMutation.mutate(content.id)}
                        className="ml-1 text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {contents.length > 3 && (
                    <Badge variant="outline">+{contents.length - 3} more</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
            <p className="text-slate-600 mt-1">Manage your skill listings and content</p>
          </div>
          <Link to={createPageUrl('CreateListing')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="bg-white shadow-sm mb-6">
            <TabsTrigger value="active">
              Active ({activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({inactiveListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : activeListings.length === 0 ? (
              <Card className="shadow-md border-0">
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No active courses</h3>
                  <p className="text-slate-500 mb-4">Share your expertise with the community!</p>
                  <Link to={createPageUrl('CreateListing')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Course
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeListings.map(renderListingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive">
            {inactiveListings.length === 0 ? (
              <Card className="shadow-md border-0">
                <CardContent className="py-16 text-center">
                  <EyeOff className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No inactive courses</h3>
                  <p className="text-slate-500">Deactivated courses will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {inactiveListings.map(renderListingCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Course
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{listingToDelete?.title}"? This action cannot be undone.
                Past sessions will remain intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(listingToDelete)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete Course
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Content Dialog */}
        <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Course Content</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Content Type</Label>
                <Select
                  value={contentForm.type}
                  onValueChange={(value) => setContentForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">
                      <div className="flex items-center gap-2">
                        <FileVideo className="w-4 h-4" />
                        Video Lecture
                      </div>
                    </SelectItem>
                    <SelectItem value="PDF">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF Notes
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  value={contentForm.title}
                  onChange={(e) => setContentForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Introduction to Python"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={contentForm.description}
                  onChange={(e) => setContentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this content..."
                  className="mt-1 h-20"
                />
              </div>

              <div>
                <Label>Upload File</Label>
                <div className="mt-1">
                  {contentForm.file_url ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                      {contentForm.type === 'VIDEO' ? (
                        <FileVideo className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-emerald-600" />
                      )}
                      <span className="text-sm text-emerald-700 flex-1 truncate">File uploaded</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setContentForm(prev => ({ ...prev, file_url: '' }))}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-sm text-slate-500">
                        {uploading ? 'Uploading...' : 'Click to upload'}
                      </span>
                      <input
                        type="file"
                        accept={contentForm.type === 'VIDEO' ? 'video/*' : 'application/pdf'}
                        className="hidden"
                        onChange={handleUploadContent}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContentDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addContentMutation.mutate()}
                disabled={!contentForm.title || !contentForm.file_url || addContentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addContentMutation.isPending ? 'Adding...' : 'Add Content'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}