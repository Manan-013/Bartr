import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  User,
  BookOpen,
  Target,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POPULAR_SKILLS = [
  "JavaScript", "Python", "React", "Guitar", "Piano", "Spanish", "French",
  "Photography", "Yoga", "Cooking", "Marketing", "Design", "Writing",
  "Public Speaking", "Excel", "Data Analysis", "Drawing", "Singing"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"];

const TIMEZONES = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC+00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+10:00", "UTC+11:00", "UTC+12:00"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    languages: ["English"],
    timezone: "UTC+00:00",
    skills_to_teach: [],
    skills_to_learn: [],
    availability: []
  });

  const [customSkill, setCustomSkill] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.Profile.filter({ user_id: user.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (existingProfile?.onboarding_completed) {
      navigate(createPageUrl('Marketplace'));
    }
    if (existingProfile) {
      setFormData({
        username: existingProfile.username || "",
        bio: existingProfile.bio || "",
        languages: existingProfile.languages || ["English"],
        timezone: existingProfile.timezone || "UTC+00:00",
        skills_to_teach: existingProfile.skills_to_teach || [],
        skills_to_learn: existingProfile.skills_to_learn || [],
        availability: existingProfile.availability || []
      });
    }
  }, [existingProfile, navigate]);

  const handleAddSkill = (type, skill) => {
    const key = type === 'teach' ? 'skills_to_teach' : 'skills_to_learn';
    if (!formData[key].includes(skill)) {
      setFormData(prev => ({
        ...prev,
        [key]: [...prev[key], skill]
      }));
    }
  };

  const handleRemoveSkill = (type, skill) => {
    const key = type === 'teach' ? 'skills_to_teach' : 'skills_to_learn';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].filter(s => s !== skill)
    }));
  };

  const handleAddCustomSkill = (type) => {
    if (customSkill.trim()) {
      handleAddSkill(type, customSkill.trim());
      setCustomSkill("");
    }
  };

  const toggleAvailability = (day, time) => {
    const exists = formData.availability.find(a => a.day === day && a.start_time === time);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        availability: prev.availability.filter(a => !(a.day === day && a.start_time === time))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        availability: [...prev.availability, { day, start_time: time, end_time: `${parseInt(time.split(':')[0]) + 1}:00` }]
      }));
    }
  };

  const isTimeSelected = (day, time) => {
    return formData.availability.some(a => a.day === day && a.start_time === time);
  };

  // Get referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const newReferralCode = generateReferralCode();
      
      const profileData = {
        user_id: user.email,
        username: formData.username.toLowerCase().replace(/\s+/g, '_'),
        bio: formData.bio,
        languages: formData.languages,
        timezone: formData.timezone,
        skills_to_teach: formData.skills_to_teach,
        skills_to_learn: formData.skills_to_learn,
        availability: formData.availability,
        onboarding_completed: true,
        average_rating: 0,
        total_reviews: 0,
        total_sessions_taught: 0,
        total_sessions_learned: 0,
        referral_code: newReferralCode,
        referred_by: referralCode || null
      };

      if (existingProfile) {
        await base44.entities.Profile.update(existingProfile.id, {
          ...profileData,
          referral_code: existingProfile.referral_code || newReferralCode // Keep existing code
        });
      } else {
        await base44.entities.Profile.create(profileData);
        // Create wallet with welcome bonus
        await base44.entities.Wallet.create({
          user_id: user.email,
          balance: 50,
          total_earned: 0,
          total_spent: 0,
          total_purchased: 0
        });
        // Record welcome bonus transaction
        await base44.entities.CreditTransaction.create({
          user_id: user.email,
          type: "bonus",
          amount: 50,
          description: "Welcome bonus credits",
          source: "bonus"
        });

        // Process referral reward if referred
        if (referralCode) {
          // Find referrer by their referral code
          const referrerProfiles = await base44.entities.Profile.filter({ referral_code: referralCode });
          const referrer = referrerProfiles[0];
          
          if (referrer && referrer.user_id !== user.email) {
            // Create referral record
            await base44.entities.Referral.create({
              referrer_user_id: referrer.user_id,
              referred_user_id: user.email,
              rewarded: true,
              reward_amount: 5
            });

            // Add credits to referrer's wallet
            const referrerWallets = await base44.entities.Wallet.filter({ user_id: referrer.user_id });
            if (referrerWallets[0]) {
              await base44.entities.Wallet.update(referrerWallets[0].id, {
                balance: (referrerWallets[0].balance || 0) + 5,
                total_earned: (referrerWallets[0].total_earned || 0) + 5
              });
            }

            // Create transaction record for referrer
            await base44.entities.CreditTransaction.create({
              user_id: referrer.user_id,
              type: "referral",
              amount: 5,
              description: `Referral bonus: ${user.full_name || user.email} joined using your link`,
              related_user_id: user.email,
              source: "referral"
            });

            // Notify referrer
            await base44.entities.Notification.create({
              user_id: referrer.user_id,
              type: "referral_bonus",
              title: "Referral Reward!",
              message: `You earned 5 credits! ${user.full_name || 'Someone'} joined using your referral link.`,
              link: "Wallet"
            });
          }
        }
      }

      queryClient.invalidateQueries(['profile']);
      navigate(createPageUrl('Marketplace'));
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Profile", icon: User },
    { num: 2, title: "Skills to Teach", icon: BookOpen },
    { num: 3, title: "Skills to Learn", icon: Target },
    { num: 4, title: "Availability", icon: Clock }
  ];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Let's set up your profile</h2>
              <p className="text-slate-600">Tell us a bit about yourself</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="johndoe"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">This will be your public profile URL</p>
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about yourself, your experience, and what you're passionate about..."
                  className="mt-1 h-32"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Languages</Label>
                  <Select
                    value={formData.languages[0]}
                    onValueChange={(value) => {
                      if (!formData.languages.includes(value)) {
                        setFormData(prev => ({ ...prev, languages: [...prev.languages, value] }));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Add languages" />
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
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">What can you teach?</h2>
              <p className="text-slate-600">Select skills you'd like to share with others</p>
            </div>

            <div>
              <Label>Your Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[60px] p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                {formData.skills_to_teach.length === 0 ? (
                  <p className="text-slate-400 text-sm">Select skills below or add your own</p>
                ) : (
                  formData.skills_to_teach.map(skill => (
                    <Badge
                      key={skill}
                      className="bg-blue-600 hover:bg-blue-700 cursor-pointer flex items-center gap-1"
                      onClick={() => handleRemoveSkill('teach', skill)}
                    >
                      {skill}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Popular Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {POPULAR_SKILLS.filter(s => !formData.skills_to_teach.includes(s)).map(skill => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => handleAddSkill('teach', skill)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Add Custom Skill</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Type a skill..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSkill('teach')}
                />
                <Button onClick={() => handleAddCustomSkill('teach')} variant="outline">
                  Add
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">What do you want to learn?</h2>
              <p className="text-slate-600">Select skills you're interested in learning</p>
            </div>

            <div>
              <Label>Skills to Learn</Label>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[60px] p-4 bg-teal-50 rounded-lg border-2 border-dashed border-teal-200">
                {formData.skills_to_learn.length === 0 ? (
                  <p className="text-slate-400 text-sm">Select skills below or add your own</p>
                ) : (
                  formData.skills_to_learn.map(skill => (
                    <Badge
                      key={skill}
                      className="bg-teal-600 hover:bg-teal-700 cursor-pointer flex items-center gap-1"
                      onClick={() => handleRemoveSkill('learn', skill)}
                    >
                      {skill}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Popular Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {POPULAR_SKILLS.filter(s => !formData.skills_to_learn.includes(s)).map(skill => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleAddSkill('learn', skill)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Add Custom Skill</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Type a skill..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSkill('learn')}
                />
                <Button onClick={() => handleAddCustomSkill('learn')} variant="outline">
                  Add
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">When are you available?</h2>
              <p className="text-slate-600">Click on time slots to mark your availability</p>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-8 gap-1">
                  <div className="p-2"></div>
                  {DAYS.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-slate-600">
                      {day.slice(0, 3)}
                    </div>
                  ))}
                  {TIMES.map(time => (
                    <React.Fragment key={time}>
                      <div className="p-2 text-right text-sm text-slate-500">{time}</div>
                      {DAYS.map(day => (
                        <div
                          key={`${day}-${time}`}
                          onClick={() => toggleAvailability(day, time)}
                          className={`p-2 rounded cursor-pointer transition-all ${
                            isTimeSelected(day, time)
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Selected: {formData.availability.length} time slots
            </p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            BARTR
          </span>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8 px-4">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div
                className={`flex flex-col items-center ${
                  step >= s.num ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  step > s.num ? 'bg-blue-600' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>

              {step < 4 ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 flex items-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !formData.username}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 flex items-center gap-2"
                >
                  {loading ? "Saving..." : "Complete Setup"}
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}