import React from "react";
import { FileVideo, FileText, Lock, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CourseContentViewer({ contents, hasAccess, isTeacher }) {
  if (!contents || contents.length === 0) {
    return (
      <Card className="shadow-md border-0">
        <CardContent className="py-12 text-center">
          <FileVideo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No course content available yet</p>
          {isTeacher && (
            <p className="text-sm text-slate-400 mt-1">Add videos or PDFs from the My Courses page</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const videos = contents.filter(c => c.type === 'VIDEO');
  const pdfs = contents.filter(c => c.type === 'PDF');

  const renderLockedContent = (content) => (
    <div
      key={content.id}
      className="flex items-center gap-3 p-4 bg-slate-100 rounded-lg opacity-60"
    >
      <div className="p-2 bg-slate-200 rounded-lg">
        {content.type === 'VIDEO' ? (
          <FileVideo className="w-5 h-5 text-slate-400" />
        ) : (
          <FileText className="w-5 h-5 text-slate-400" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-600">{content.title}</p>
        {content.description && (
          <p className="text-sm text-slate-400">{content.description}</p>
        )}
      </div>
      <Lock className="w-5 h-5 text-slate-400" />
    </div>
  );

  const renderUnlockedContent = (content) => (
    <div
      key={content.id}
      className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className={`p-2 rounded-lg ${content.type === 'VIDEO' ? 'bg-blue-100' : 'bg-teal-100'}`}>
        {content.type === 'VIDEO' ? (
          <FileVideo className="w-5 h-5 text-blue-600" />
        ) : (
          <FileText className="w-5 h-5 text-teal-600" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-900">{content.title}</p>
        {content.description && (
          <p className="text-sm text-slate-500">{content.description}</p>
        )}
      </div>
      {content.type === 'VIDEO' ? (
        <a href={content.file_url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Play className="w-4 h-4 mr-1" />
            Watch
          </Button>
        </a>
      ) : (
        <a href={content.file_url} target="_blank" rel="noopener noreferrer" download>
          <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {!hasAccess && !isTeacher && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Content Locked</p>
            <p className="text-sm text-amber-600">
              Request a session and get accepted to unlock course materials
            </p>
          </div>
        </div>
      )}

      {/* Video Lectures */}
      {videos.length > 0 && (
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileVideo className="w-5 h-5 text-blue-600" />
              Video Lectures
              <Badge variant="secondary">{videos.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {videos.map((content) =>
              hasAccess || isTeacher
                ? renderUnlockedContent(content)
                : renderLockedContent(content)
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF Notes */}
      {pdfs.length > 0 && (
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-teal-600" />
              PDF Notes
              <Badge variant="secondary">{pdfs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pdfs.map((content) =>
              hasAccess || isTeacher
                ? renderUnlockedContent(content)
                : renderLockedContent(content)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}