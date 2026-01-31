import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Star, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const categoryColors = {
  technology: "bg-blue-100 text-blue-700 border-blue-200",
  languages: "bg-emerald-100 text-emerald-700 border-emerald-200",
  music: "bg-teal-100 text-teal-700 border-teal-200",
  art: "bg-cyan-100 text-cyan-700 border-cyan-200",
  business: "bg-amber-100 text-amber-700 border-amber-200",
  fitness: "bg-rose-100 text-rose-700 border-rose-200",
  cooking: "bg-orange-100 text-orange-700 border-orange-200",
  crafts: "bg-teal-100 text-teal-700 border-teal-200",
  academics: "bg-blue-100 text-blue-700 border-blue-200",
  other: "bg-slate-100 text-slate-700 border-slate-200"
};

const levelBadges = {
  beginner: "bg-emerald-50 text-emerald-600",
  intermediate: "bg-blue-50 text-blue-600",
  advanced: "bg-teal-50 text-teal-600",
  expert: "bg-amber-50 text-amber-600"
};

export default function SkillCard({ listing, profile, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group h-full border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
        {listing.cover_image && (
          <div className="h-32 overflow-hidden">
            <img
              src={listing.cover_image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <CardContent className={`p-5 ${!listing.cover_image ? 'pt-5' : ''}`}>
          {/* Category & Level */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className={`${categoryColors[listing.category]} text-xs`}>
              {listing.category}
            </Badge>
            <Badge className={`${levelBadges[listing.level]} text-xs border-0`}>
              {listing.level}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {listing.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {listing.description}
          </p>

          {/* Teacher Info */}
          <Link 
            to={createPageUrl('Profile') + `?username=${profile?.username}`}
            className="flex items-center gap-3 mb-4 group/teacher"
          >
            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 truncate group-hover/teacher:text-blue-600 transition-colors">
                {profile?.username || 'Anonymous'}
              </p>
              <div className="flex items-center gap-1">
                {profile?.average_rating > 0 ? (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-slate-600">
                      {profile.average_rating.toFixed(1)} ({profile.total_reviews})
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">New teacher</span>
                )}
              </div>
            </div>
          </Link>

          {/* Tags */}
          {listing.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {listing.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {tag}
                </span>
              ))}
              {listing.tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  +{listing.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {listing.credits_per_hour === 0 ? (
              <Badge className="bg-green-600 text-white text-sm px-3 py-1">FREE</Badge>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">₿</span>
                </div>
                <span className="font-bold text-slate-900">{listing.credits_per_hour}</span>
                <span className="text-sm text-slate-500">/hr</span>
              </div>
            )}
            <Link to={createPageUrl('SkillDetails') + `?id=${listing.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 group/btn">
                View
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}