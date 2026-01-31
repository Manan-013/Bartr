import React, { useState } from "react";
import { db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Sparkles,
  Plus,
  History,
  RefreshCw,
  Copy,
  Check,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const CREDIT_PACKS = [
  { credits: 50, price: 4.99, popular: false },
  { credits: 100, price: 8.99, popular: true },
  { credits: 250, price: 19.99, popular: false },
  { credits: 500, price: 34.99, popular: false },
];

const transactionIcons = {
  earned: TrendingUp,
  spent: TrendingDown,
  purchased: ShoppingCart,
  bonus: Gift,
  refund: RefreshCw,
  admin_adjustment: Sparkles,
  referral: Users
};

const transactionColors = {
  earned: "text-emerald-600 bg-emerald-50",
  spent: "text-rose-600 bg-rose-50",
  purchased: "text-blue-600 bg-blue-50",
  bonus: "text-teal-600 bg-teal-50",
  refund: "text-amber-600 bg-amber-50",
  admin_adjustment: "text-cyan-600 bg-cyan-50",
  referral: "text-emerald-600 bg-emerald-50"
};

export default function Wallet() {
  const queryClient = useQueryClient();
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user } = useAuth();


  const { data: profile } = useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const profileDocRef = doc(db, 'profiles', user.uid);
      const profileDoc = await getDoc(profileDocRef);
      return profileDoc.exists() ? profileDoc.data() : null;
    },
    enabled: !!user?.uid,
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.uid],
    queryFn: async () => {
      if (!user) return { balance: 0, total_earned: 0, total_spent: 0, total_purchased: 0 };
      const walletDocRef = doc(db, 'wallets', user.uid);
      const walletDoc = await getDoc(walletDocRef);
      return walletDoc.exists() ? walletDoc.data() : { balance: 0, total_earned: 0, total_spent: 0, total_purchased: 0 };
    },
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, 'transactions'), where('user_id', '==', user.uid), orderBy('created_date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user?.uid,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, 'referrals'), where('referrer_user_id', '==', user.uid));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user?.uid,
  });

  const referralLink = profile?.referral_code 
    ? `${window.location.origin}?ref=${profile.referral_code}` 
    : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referralEarnings = referrals.filter(r => r.rewarded).length * 5;

  const purchaseMutation = useMutation({
    mutationFn: async (pack) => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      setPurchasing(true);
      const walletRef = doc(db, 'wallets', user.uid);
      const walletDoc = await getDoc(walletRef);

      const newBalance = (walletDoc.exists() ? walletDoc.data().balance : 0) + pack.credits;
      const newTotalPurchased = (walletDoc.exists() ? walletDoc.data().total_purchased : 0) + pack.credits;

      if (walletDoc.exists()) {
        await updateDoc(walletRef, {
          balance: newBalance,
          total_purchased: newTotalPurchased,
        });
      } else {
        await setDoc(walletRef, {
          user_id: user.uid,
          balance: newBalance,
          total_earned: 0,
          total_spent: 0,
          total_purchased: pack.credits,
        });
      }

      await addDoc(collection(db, 'transactions'), {
        user_id: user.uid,
        type: 'purchased',
        amount: pack.credits,
        description: `Purchased ${pack.credits} credits for $${pack.price}`,
        source: 'purchase',
        created_date: new Date(),
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wallet', user.uid]);
      queryClient.invalidateQueries(['transactions', user.uid]);
      setBuyCreditsOpen(false);
      setPurchasing(false);
    },
    onError: (error) => {
      console.error("Purchase failed: ", error);
      alert('An error occurred while processing your purchase. Please try again.');
      setPurchasing(false);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
          <p className="text-slate-600 mt-1">Manage your credits and view transaction history</p>
        </div>

        {/* Balance Card */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white mb-8 overflow-hidden">
          <CardContent className="p-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
            
            <div className="relative">
              <p className="text-blue-100 mb-2">Current Balance</p>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">₿</span>
                  </div>
                </div>
                <div>
                  <p className="text-5xl font-bold">
                    {walletLoading ? '...' : wallet?.balance || 0}
                  </p>
                  <p className="text-blue-100">credits</p>
                </div>
              </div>

              <Dialog open={buyCreditsOpen} onOpenChange={setBuyCreditsOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-blue-600 hover:bg-blue-50" disabled={!user}>
                    <Plus className="w-4 h-4 mr-2" />
                    Buy More Credits
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Buy Credit Packs</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    {CREDIT_PACKS.map((pack) => (
                      <Card
                        key={pack.credits}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          pack.popular ? 'border-2 border-blue-500 relative' : ''
                        }`}
                        onClick={() => purchaseMutation.mutate(pack)}
                      >
                        {pack.popular && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600">
                            Most Popular
                          </Badge>
                        )}
                        <CardContent className="p-6 text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-white font-bold">₿</span>
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{pack.credits}</p>
                          <p className="text-sm text-slate-500 mb-3">credits</p>
                          <p className="text-xl font-semibold text-blue-600">${pack.price}</p>
                          <p className="text-xs text-slate-400">
                            ${(pack.price / pack.credits).toFixed(2)}/credit
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {purchasing && (
                    <div className="text-center py-4 text-blue-600">
                      Processing purchase...
                    </div>
                  )}
                  <p className="text-xs text-slate-500 text-center">
                    Demo mode: Credits will be added instantly without payment
                  </p>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Referral Card */}
        <Card className="shadow-lg border-0 mb-8 bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Users className="w-5 h-5" />
              Refer & Earn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Share your referral link and earn <span className="font-bold text-emerald-600">+5 credits</span> when friends complete onboarding!
            </p>
            
            {profile?.referral_code ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    value={referralLink} 
                    readOnly 
                    className="bg-white"
                  />
                  <Button 
                    onClick={copyReferralLink}
                    variant="outline"
                    className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                  <div>
                    <p className="text-sm text-slate-500">Friends Referred</p>
                    <p className="text-2xl font-bold text-slate-900">{referrals.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Earned</p>
                    <p className="text-2xl font-bold text-emerald-600">+{referralEarnings} credits</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Complete your profile to get your referral code.</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Earned</p>
                  <p className="text-2xl font-bold text-emerald-600">{wallet?.total_earned || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Spent</p>
                  <p className="text-2xl font-bold text-rose-600">{wallet?.total_spent || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Purchased</p>
                  <p className="text-2xl font-bold text-blue-600">{wallet?.total_purchased || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <WalletIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No transactions yet</p>
                <p className="text-sm text-slate-400 mt-1">Your credit activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const Icon = transactionIcons[transaction.type] || Sparkles;
                  const colorClass = transactionColors[transaction.type] || transactionColors.bonus;
                  const isPositive = transaction.amount > 0;

                  return (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${colorClass.split(' ')[1]}`}>
                          <Icon className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{transaction.description}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(transaction.created_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                        {isPositive ? '+' : ''}{transaction.amount}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}