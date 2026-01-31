import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Camera,
  Globe,
  Shield,
  LogOut,
  Save,
  X,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"];
const TIMEZONES = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC+00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+10:00", "UTC+11:00", "UTC+12:00"
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    languages: [],
    timezone: "UTC+00:00",
    avatar_url: "",
    skills_to_teach: [],
    skills_to_learn: [],
    email_notifications: true,
    push_notifications: true
  });
  const [newSkillTeach, setNewSkillTeach] = useState("");
  const [newSkillLearn, setNewSkillLearn] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.Profile.filter({ user_id: user.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        bio: profile.bio || "",
        languages: profile.languages || ["English"],
        timezone: profile.timezone || "UTC+00:00",
        avatar_url: profile.avatar_url || "",
        skills_to_teach: profile.skills_to_teach || [],
        skills_to_learn: profile.skills_to_learn || [],
        email_notifications: profile.email_notifications !== false,
        push_notifications: profile.push_notifications !== false
      });
    }
  }, [profile]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({ ...prev, avatar_url: file_url }));
      } catch (error) {
        console.error('Error uploading avatar:', error);
      }
    }
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      await base44.entities.Profile.update(profile.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      setSaving(false);
    },
    onError: () => {
      setSaving(false);
    }
  });

  const handleAddSkill = (type) => {
    const skill = type === 'teach' ? newSkillTeach : newSkillLearn;
    const field = type === 'teach' ? 'skills_to_teach' : 'skills_to_learn';
    
    if (skill.trim() && !formData[field].includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], skill.trim()]
      }));
      type === 'teach' ? setNewSkillTeach("") : setNewSkillLearn("");
    }
  };

  const handleRemoveSkill = (type, skill) => {
    const field = type === 'teach' ? 'skills_to_teach' : 'skills_to_learn';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(s => s !== skill)
    }));
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
        <div className="animate-pulse text-blue-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your profile and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your public profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-2xl">
                        {formData.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-2 bg-violet-600 rounded-full cursor-pointer hover:bg-violet-700 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{formData.username}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {/* Bio */}
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    className="mt-1 h-32"
                  />
                </div>

                {/* Languages */}
                <div>
                  <Label>Languages</Label>
                  <Select
                    onValueChange={(value) => {
                      if (!formData.languages.includes(value)) {
                        setFormData(prev => ({ ...prev, languages: [...prev.languages, value] }));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Add a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.languages.map(lang => (
                      <Badge key={lang} variant="secondary" className="flex items-center gap-1">
                        {lang}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            languages: prev.languages.filter(l => l !== lang)
                          }))}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <Label>Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notifications */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-slate-500">Receive session updates via email</p>
                    </div>
                    <Switch
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-slate-500">Receive real-time notifications</p>
                    </div>
                    <Switch
                      checked={formData.push_notifications}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, push_notifications: checked }))}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => saveProfileMutation.mutate()}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills">
            <div className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Skills I Teach</CardTitle>
                  <CardDescription>Skills you can offer to others</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newSkillTeach}
                      onChange={(e) => setNewSkillTeach(e.target.value)}
                      placeholder="Add a skill..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('teach')}
                    />
                    <Button onClick={() => handleAddSkill('teach')} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills_to_teach.map(skill => (
                      <Badge
                        key={skill}
                        className="bg-blue-100 text-blue-700 flex items-center gap-1"
                      >
                        {skill}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => handleRemoveSkill('teach', skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Skills I Want to Learn</CardTitle>
                  <CardDescription>Skills you're interested in learning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newSkillLearn}
                      onChange={(e) => setNewSkillLearn(e.target.value)}
                      placeholder="Add a skill..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('learn')}
                    />
                    <Button onClick={() => handleAddSkill('learn')} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills_to_learn.map(skill => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-teal-200 text-teal-700 flex items-center gap-1"
                      >
                        {skill}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => handleRemoveSkill('learn', skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => saveProfileMutation.mutate()}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account and security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900 mb-1">Email Address</p>
                  <p className="text-slate-600">{user?.email}</p>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Danger Zone</h3>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-2" />
                        Log Out
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Log out?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to log out of your account?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                          Log Out
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}