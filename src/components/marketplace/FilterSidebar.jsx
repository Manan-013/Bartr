import React from "react";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CATEGORIES = [
  { id: "technology", label: "Technology" },
  { id: "languages", label: "Languages" },
  { id: "music", label: "Music" },
  { id: "art", label: "Art" },
  { id: "business", label: "Business" },
  { id: "fitness", label: "Fitness" },
  { id: "cooking", label: "Cooking" },
  { id: "crafts", label: "Crafts" },
  { id: "academics", label: "Academics" },
  { id: "other", label: "Other" }
];

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "expert", label: "Expert" }
];

export default function FilterSidebar({ filters, setFilters, onClear }) {
  const [openSections, setOpenSections] = React.useState({
    categories: true,
    levels: true,
    credits: true
  });

  const toggleCategory = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const toggleLevel = (levelId) => {
    setFilters(prev => ({
      ...prev,
      levels: prev.levels.includes(levelId)
        ? prev.levels.filter(l => l !== levelId)
        : [...prev.levels, levelId]
    }));
  };

  const activeFiltersCount = 
    filters.categories.length + 
    filters.levels.length + 
    (filters.maxCredits < 100 ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-slate-500 hover:text-slate-700">
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Categories */}
        <Collapsible
          open={openSections.categories}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, categories: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
            <Label className="text-sm font-medium cursor-pointer">Categories</Label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-2">
              {CATEGORIES.map((category) => (
                <div key={category.id} className="flex items-center gap-3">
                  <Checkbox
                    id={category.id}
                    checked={filters.categories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <label
                    htmlFor={category.id}
                    className="text-sm text-slate-600 cursor-pointer hover:text-slate-900"
                  >
                    {category.label}
                  </label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Levels */}
        <Collapsible
          open={openSections.levels}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, levels: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
            <Label className="text-sm font-medium cursor-pointer">Skill Level</Label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.levels ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-2">
              {LEVELS.map((level) => (
                <div key={level.id} className="flex items-center gap-3">
                  <Checkbox
                    id={level.id}
                    checked={filters.levels.includes(level.id)}
                    onCheckedChange={() => toggleLevel(level.id)}
                  />
                  <label
                    htmlFor={level.id}
                    className="text-sm text-slate-600 cursor-pointer hover:text-slate-900"
                  >
                    {level.label}
                  </label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Credit Range */}
        <Collapsible
          open={openSections.credits}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, credits: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
            <Label className="text-sm font-medium cursor-pointer">Max Credits/Hour</Label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.credits ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="px-1">
              <Slider
                value={[filters.maxCredits]}
                onValueChange={([value]) => setFilters(prev => ({ ...prev, maxCredits: value }))}
                max={100}
                min={1}
                step={1}
                className="mb-3"
              />
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>1 credit</span>
                <span className="font-medium text-blue-600">{filters.maxCredits} credits</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}