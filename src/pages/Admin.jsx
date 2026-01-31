import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Shield,
  Users,
  BookOpen,
  Calendar,
  Flag,
  Coins,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function Admin() {
  const queryClient = useQueryClient();
  const [creditAdjustDialog, setCreditAdjustDialog] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.Profile.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['allListings'],
    queryFn: () => base44.entities.SkillListing.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['allSessions'],
    queryFn: () => base44.entities.Session.list(),
    enabled: user?.role === 'admin',
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['allReports'],
    queryFn: () => base44.entities.Report.filter({}, '-created_date'),
    enabled: user?.role === 'admin',
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['allWallets'],
    queryFn: () => base44.entities.Wallet.list(),
    enabled: user?.role === 'admin',
  });
  
  const adjustCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }) => {
      const wallet = walletsMap[userId];
      if (wallet) {
        await base44.entities.Wallet.update(wallet.id, {
          balance: (wallet.balance || 0) + amount
        });
      } else {
        await base44.entities.Wallet.create({
          user_id: userId,
          balance: amount,
          total_earned: 0,
          total_spent: 0,
          total_purchased: 0
        });
      }

      await base44.entities.CreditTransaction.create({
        user_id: userId,
        type: 'admin_adjustment',
        amount,
        description: `Admin adjustment: ${reason}`
      });

      await base44.entities.Notification.create({
        user_id: userId,
        type: 'system',
        title: 'Credit Adjustment',
        message: `Your credit balance has been adjusted by ${amount}. Reason: ${reason}`,
        link: 'Wallet'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allWallets']);
      setCreditAdjustDialog(null);
      setCreditAmount(0);
      setCreditReason("");
    }
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }) => {
      await base44.entities.Report.update(reportId, {
        status,
        admin_notes: notes,
        resolved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allReports']);
    }
  });

  // Check if user is admin
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center">
        <Card className="shadow-xl border-0 max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-4">You don't have permission to access the admin panel.</p>
            <Link to={createPageUrl('Marketplace')}>
              <Button>Go to Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
  const walletsMap = wallets.reduce((acc, w) => ({ ...acc, [w.user_id]: w }), {});

  const totalCredits = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-violet-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-slate-600">Manage users, content, and platform settings</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-50 rounded-xl">
                  <BookOpen className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Skill Listings</p>
                  <p className="text-2xl font-bold text-slate-900">{listings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sessions Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{completedSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Coins className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Credits</p>
                  <p className="text-2xl font-bold text-slate-900">{totalCredits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Reports Alert */}
        {pendingReports > 0 && (
          <Card className="shadow-md border-0 bg-amber-50 border-amber-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800 font-medium">
                  {pendingReports} pending report(s) require your attention
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">
              Reports
              {pendingReports > 0 && (
                <Badge className="bg-red-500 ml-2">{pendingReports}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const profile = profilesMap[u.email];
                      const wallet = walletsMap[u.email];
                      
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="bg-violet-100 text-violet-600 text-sm">
                                  {(profile?.username || u.email)?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{profile?.username || 'No profile'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{wallet?.balance || 0}</TableCell>
                          <TableCell>
                            {(profile?.total_sessions_taught || 0) + (profile?.total_sessions_learned || 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCreditAdjustDialog(u.email)}
                              >
                                <Coins className="w-3 h-3 mr-1" />
                                Adjust
                              </Button>
                              <Link to={createPageUrl('Profile') + `?username=${profile?.username}`}>
                                <Button size="sm" variant="ghost">
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <Flag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No reports submitted</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-4 rounded-lg border ${
                          report.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                                {report.status}
                              </Badge>
                              <Badge variant="outline">{report.reason}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{report.description}</p>
                            <p className="text-xs text-slate-500">
                              Reported by: {report.reporter_id} | Against: {report.reported_user_id}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(report.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => resolveReportMutation.mutate({
                                  reportId: report.id,
                                  status: 'resolved',
                                  notes: 'Reviewed and resolved'
                                })}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveReportMutation.mutate({
                                  reportId: report.id,
                                  status: 'dismissed',
                                  notes: 'No action needed'
                                })}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Learner</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.slice(0, 20).map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.skill_title}</TableCell>
                        <TableCell>{profilesMap[session.teacher_id]?.username || session.teacher_id}</TableCell>
                        <TableCell>{profilesMap[session.learner_id]?.username || session.learner_id}</TableCell>
                        <TableCell>{format(new Date(session.scheduled_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{session.credits_amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Credit Adjustment Dialog */}
        <Dialog open={!!creditAdjustDialog} onOpenChange={() => setCreditAdjustDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Credits</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600">
                Adjusting credits for: <span className="font-medium">{creditAdjustDialog}</span>
              </p>
              <p className="text-sm text-slate-600">
                Current balance: <span className="font-medium">{walletsMap[creditAdjustDialog]?.balance || 0}</span>
              </p>
              <div>
                <Label>Amount (positive to add, negative to deduct)</Label>
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditAdjustDialog(null)}>Cancel</Button>
              <Button
                onClick={() => adjustCreditsMutation.mutate({
                  userId: creditAdjustDialog,
                  amount: creditAmount,
                  reason: creditReason
                })}
                disabled={!creditReason || creditAmount === 0 || adjustCreditsMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {adjustCreditsMutation.isPending ? 'Adjusting...' : 'Apply Adjustment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}