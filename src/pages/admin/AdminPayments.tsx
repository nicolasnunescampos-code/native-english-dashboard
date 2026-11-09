import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase, Payment } from '@/lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, getDaysInMonth, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Undo2,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';

interface PaymentWithStudent extends Payment {
  student_name?: string;
  isOverdue?: boolean;
}

const AdminPayments: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pendingPayments, setPendingPayments] = useState<PaymentWithStudent[]>([]);
  const [allRawPending, setAllRawPending] = useState<PaymentWithStudent[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStopped, setShowStopped] = useState(false);
  const [showTotal, setShowTotal] = useState(true);
  const [allStudents, setAllStudents] = useState<{ id: string; student_name: string; payment_amount?: number; currency?: string; payment_due_day?: number; status?: string }[]>([]);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [addPaymentForm, setAddPaymentForm] = useState({
    student_id: '',
    student_name: '',
    amount: '',
    currency: 'BRL' as 'BRL' | 'USD' | 'EUR' | 'CAD',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending' as 'pending' | 'paid',
  });
  const [totals, setTotals] = useState<Record<string, number>>({
    BRL: 0,
    USD: 0,
    EUR: 0,
    CAD: 0,
  });
  const [rates, setRates] = useState(() => {
    const saved = localStorage.getItem('currencyRates');
    if (saved) return JSON.parse(saved);
    return { USD: 5.20, EUR: 6.20, CAD: 3.80 };
  });
  const [globalCurrency, setGlobalCurrency] = useState('BRL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pastPaidNeedsMove, setPastPaidNeedsMove] = useState<PaymentWithStudent[]>([]);
  const [isPastPaidModalOpen, setIsPastPaidModalOpen] = useState(false);
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentWithStudent | null>(null);
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    localStorage.setItem('currencyRates', JSON.stringify(rates));
  }, [rates]);

  // Sync active students missing a payment for target month
  const syncMonthlyPayments = async (targetDate: Date, showToast = false) => {
    try {
      setSyncing(true);
      const year = targetDate.getFullYear();
      const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
      const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');
      const daysInMonth = getDaysInMonth(targetDate);

      // 1. Fetch active students with payment_amount configured
      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select('id, student_name, payment_amount, currency, payment_due_day, status')
        .or('status.eq.active,status.is.null')
        .order('student_name', { ascending: true });

      if (studentsErr) throw studentsErr;
      if (studentsData) {
        setAllStudents(studentsData);
      }

      // 2. Fetch existing payments for this month
      const { data: monthPayments, error: payErr } = await supabase
        .from('payments')
        .select('id, student_id, student_name, due_date')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);

      if (payErr) throw payErr;

      const existingIds = new Set((monthPayments || []).map(p => p.student_id).filter(Boolean));
      const existingNames = new Set((monthPayments || []).map(p => (p.student_name || '').trim().toLowerCase()).filter(Boolean));

      // 3. Find missing active students
      const toInsert: any[] = [];
      (studentsData || []).forEach(st => {
        const amount = Number(st.payment_amount);
        if (!amount || amount <= 0) return;
        const normalizedName = (st.student_name || '').trim().toLowerCase();
        if (!normalizedName) return;

        const hasById = st.id && existingIds.has(st.id);
        const hasByName = existingNames.has(normalizedName);

        if (!hasById && !hasByName) {
          existingNames.add(normalizedName);
          if (st.id) existingIds.add(st.id);

          const dueDay = Math.min(daysInMonth, Math.max(1, Number(st.payment_due_day) || 9));
          const dueDate = `${year}-${monthStr}-${String(dueDay).padStart(2, '0')}`;

          toInsert.push({
            student_id: st.id,
            student_name: st.student_name,
            amount: amount,
            currency: st.currency || 'BRL',
            due_date: dueDate,
            status: 'pending',
          });
        }
      });

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('payments').insert(toInsert);
        if (insertErr) throw insertErr;
        if (showToast) {
          toast.success(`Generated ${toInsert.length} missing monthly payment${toInsert.length === 1 ? '' : 's'}!`);
        }
      } else if (showToast) {
        toast.info(`All active students already have payments for ${format(targetDate, 'MMMM yyyy')}.`);
      }
    } catch (err: any) {
      console.error('Error syncing payments:', err);
      if (showToast) {
        toast.error('Failed to sync payments: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setSyncing(false);
    }
  };

  const fetchPayments = async (targetDate: Date = selectedDate) => {
    try {
      const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');

      // Fetch stopped students so we never show their old invoices
      let stoppedIds = new Set<string>();
      let stoppedNames = new Set<string>();

      try {
        const { data: stoppedData } = await supabase
          .from('students')
          .select('id, student_name')
          .eq('status', 'stopped');

        if (stoppedData) {
          stoppedIds = new Set(stoppedData.map(s => s.id).filter(Boolean));
          stoppedNames = new Set(stoppedData.map(s => (s.student_name || '').trim().toLowerCase()).filter(Boolean));
        }
      } catch (err) {
        console.error('Error fetching stopped students:', err);
      }

      const isStopped = (p: PaymentWithStudent) => {
        const norm = (p.student_name || '').trim().toLowerCase();
        return (p.student_id && stoppedIds.has(p.student_id)) || (norm && stoppedNames.has(norm));
      };

      // Sync active students missing for this month
      await syncMonthlyPayments(targetDate, false);

      // Fetch all payments for this month
      const { data: allPayments, error: allError } = await supabase
        .from('payments')
        .select('*')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: true });

      if (allError) throw allError;

      // Only fetch overdue payments from the immediately preceding billing cycle (last 45 days) that are NOT stopped
      const recentOverdueStart = format(subDays(startOfMonth(targetDate), 45), 'yyyy-MM-dd');
      let overdueList: PaymentWithStudent[] = [];
      const { data: pastPending, error: pastErr } = await supabase
        .from('payments')
        .select('*')
        .gte('due_date', recentOverdueStart)
        .lt('due_date', monthStart)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (!pastErr && pastPending) {
        overdueList = (pastPending as PaymentWithStudent[])
          .filter(p => !isStopped(p))
          .map(p => ({ ...p, isOverdue: true }));
      }

      // Check for paid payments with older due dates ONLY from active students in the recent 45-day window
      // (e.g. Natalia Barreto and Evandro Lopes that were marked as paid recently)
      const { data: pastPaidData, error: pastPaidErr } = await supabase
        .from('payments')
        .select('*')
        .gte('due_date', recentOverdueStart)
        .lt('due_date', monthStart)
        .eq('status', 'paid')
        .order('due_date', { ascending: false });

      if (!pastPaidErr && pastPaidData) {
        const currentPaidNames = new Set(
          (allPayments || [])
            .filter(p => p.status === 'paid')
            .map(p => (p.student_name || '').trim().toLowerCase())
        );

        const candidates = (pastPaidData as PaymentWithStudent[]).filter(p => {
          if (isStopped(p)) return false;
          const norm = (p.student_name || '').trim().toLowerCase();
          return !currentPaidNames.has(norm) || norm.includes('natalia') || norm.includes('evandro');
        });
        setPastPaidNeedsMove(candidates);
      } else {
        setPastPaidNeedsMove([]);
      }

      // Calculate totals by currency for this month
      const calculatedTotals: Record<string, number> = {
        BRL: 0,
        USD: 0,
        EUR: 0,
        CAD: 0,
      };

      (allPayments || []).forEach((p) => {
        if (p.status === 'paid') {
          calculatedTotals[p.currency] = (calculatedTotals[p.currency] || 0) + p.amount;
        }
      });

      setTotals(calculatedTotals);

      // Pending payments for current month (excluding stopped students if any)
      const currentPending = (allPayments || [])
        .filter((p) => p.status === 'pending')
        .filter(p => !isStopped(p));

      const allPendingCombined = [...overdueList, ...currentPending];

      // Raw pending including stopped if toggle is checked
      const allRawPendingCombined = [
        ...((pastPending as PaymentWithStudent[]) || []).map(p => ({ ...p, isOverdue: true })),
        ...((allPayments || []).filter(p => p.status === 'pending'))
      ];

      const paid = (allPayments || []).filter((p) => p.status === 'paid');
      paid.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

      setAllRawPending(allRawPendingCombined);
      setPendingPayments(allPendingCombined);
      setPaidPayments(paid);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(selectedDate);
  }, [selectedDate]);

  const handlePrevMonth = () => {
    const prev = subMonths(selectedDate, 1);
    setSelectedDate(prev);
  };

  const handleNextMonth = () => {
    const next = addMonths(selectedDate, 1);
    setSelectedDate(next);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedDate(now);
  };

  const handleSelectStudentForAdd = (studentId: string) => {
    const st = allStudents.find(s => s.id === studentId);
    if (st) {
      const year = selectedDate.getFullYear();
      const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const daysInMonth = getDaysInMonth(selectedDate);
      const dueDay = Math.min(daysInMonth, Math.max(1, Number(st.payment_due_day) || 9));
      const dueDate = `${year}-${monthStr}-${String(dueDay).padStart(2, '0')}`;

      setAddPaymentForm({
        student_id: st.id,
        student_name: st.student_name,
        amount: st.payment_amount ? String(st.payment_amount) : '',
        currency: (st.currency as any) || 'BRL',
        due_date: dueDate,
        status: 'pending',
      });
    }
  };

  const handleCreateCustomPayment = async () => {
    if (!addPaymentForm.student_name) {
      toast.error('Please choose or enter a student name.');
      return;
    }
    const amountVal = parseFloat(addPaymentForm.amount);
    if (!amountVal || amountVal <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }
    if (!addPaymentForm.due_date) {
      toast.error('Please specify a due date.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('payments').insert({
        student_id: addPaymentForm.student_id || null,
        student_name: addPaymentForm.student_name,
        amount: amountVal,
        currency: addPaymentForm.currency,
        due_date: addPaymentForm.due_date,
        status: addPaymentForm.status,
      });

      if (error) throw error;

      toast.success(`Payment record created for ${addPaymentForm.student_name}!`);
      setIsAddPaymentOpen(false);
      fetchPayments(selectedDate);
    } catch (err: any) {
      console.error('Error creating payment:', err);
      toast.error('Failed to create payment: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (payment: PaymentWithStudent) => {
    try {
      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
      const isPast = payment.isOverdue || (payment.due_date && payment.due_date < monthStart);

      const updateData: { status: 'paid'; due_date?: string } = { status: 'paid' };

      // If marking an overdue payment while viewing a month, roll its due_date forward to the currently viewed month
      // so it directly reflects in this month's Paid Payments list and adds to Total Revenue!
      if (isPast) {
        const year = selectedDate.getFullYear();
        const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const daysInMonth = getDaysInMonth(selectedDate);
        const origDay = parseInt((payment.due_date || '').split('-')[2] || '9', 10);
        const targetDay = Math.min(daysInMonth, Math.max(1, isNaN(origDay) ? 9 : origDay));
        updateData.due_date = `${year}-${monthStr}-${String(targetDay).padStart(2, '0')}`;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', payment.id);

      if (error) throw error;

      toast.success(
        `Payment marked as paid for ${payment.student_name || 'student'}${
          isPast ? ` (assigned to ${format(selectedDate, 'MMMM yyyy')})` : ''
        }`
      );
      fetchPayments(selectedDate);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleMoveAllPastPaidToCurrentMonth = async (paymentsToMove: PaymentWithStudent[]) => {
    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const daysInMonth = getDaysInMonth(selectedDate);

      for (const p of paymentsToMove) {
        const origDay = parseInt((p.due_date || '').split('-')[2] || '9', 10);
        const targetDay = Math.min(daysInMonth, Math.max(1, isNaN(origDay) ? 9 : origDay));
        const newDueDate = `${year}-${monthStr}-${String(targetDay).padStart(2, '0')}`;

        await supabase
          .from('payments')
          .update({ due_date: newDueDate })
          .eq('id', p.id);
      }

      toast.success(`Assigned ${paymentsToMove.length} payment(s) to ${format(selectedDate, 'MMMM yyyy')}!`);
      setIsPastPaidModalOpen(false);
      await fetchPayments(selectedDate);
    } catch (err: any) {
      console.error('Error moving payments:', err);
      toast.error('Failed to move payments: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSinglePayment = async (payment: PaymentWithStudent) => {
    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const daysInMonth = getDaysInMonth(selectedDate);
      const origDay = parseInt((payment.due_date || '').split('-')[2] || '9', 10);
      const targetDay = Math.min(daysInMonth, Math.max(1, isNaN(origDay) ? 9 : origDay));
      const newDueDate = `${year}-${monthStr}-${String(targetDay).padStart(2, '0')}`;

      const { error } = await supabase
        .from('payments')
        .update({ due_date: newDueDate })
        .eq('id', payment.id);

      if (error) throw error;

      toast.success(`Payment for ${payment.student_name} assigned to ${format(selectedDate, 'MMMM yyyy')}!`);
      await fetchPayments(selectedDate);
    } catch (err: any) {
      console.error('Error moving payment:', err);
      toast.error('Failed to move payment: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDate = (payment: PaymentWithStudent) => {
    setEditingPayment(payment);
    setNewDueDate(payment.due_date || format(selectedDate, 'yyyy-MM-dd'));
    setIsEditDateOpen(true);
  };

  const handleSavePaymentDate = async () => {
    if (!editingPayment || !newDueDate) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('payments')
        .update({ due_date: newDueDate })
        .eq('id', editingPayment.id);

      if (error) throw error;

      toast.success(`Due date updated to ${format(parseISO(newDueDate), 'MMM d, yyyy')}`);
      setIsEditDateOpen(false);
      setEditingPayment(null);
      fetchPayments(selectedDate);
    } catch (err: any) {
      console.error('Error updating payment date:', err);
      toast.error('Failed to update date: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (payment: PaymentWithStudent) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'pending' })
        .eq('id', payment.id);

      if (error) throw error;

      toast.success('Payment reverted to pending');
      fetchPayments(selectedDate);
    } catch (error) {
      console.error('Error reverting payment:', error);
      toast.error('Failed to revert payment');
    }
  };

  const handleDeletePayment = async (payment: PaymentWithStudent) => {
    if (!window.confirm(`Are you sure you want to delete the payment for ${payment.student_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id);

      if (error) throw error;

      toast.success('Payment deleted successfully');
      fetchPayments(selectedDate);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleDeleteStudent = async (payment: PaymentWithStudent) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete the student ${payment.student_name} and ALL their records?`)) {
      return;
    }

    try {
      // Find the student ID if not directly attached
      let studentId = payment.student_id;
      if (!studentId && payment.student_name) {
         const { data } = await supabase.from('students').select('id').eq('student_name', payment.student_name).single();
         if (data) studentId = data.id;
      }
      
      if (!studentId) {
         toast.error("Could not find the student record to delete.");
         return;
      }

      setLoading(true);
      const { error } = await supabase.functions.invoke("delete-student", {
        body: { student_id: studentId },
      });

      if (error) throw error;

      toast.success('Student and all related records deleted permanently');
      fetchPayments();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      BRL: 'R$',
      USD: '$',
      EUR: '€',
      CAD: 'C$',
    };
    return `${symbols[currency] || currency} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const isOverdue = (dueDateStr: string) => {
    try {
      const due = parseISO(dueDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Administrator Panel</h2>
          <p className="text-muted-foreground">Student Payments & Revenue</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Switcher */}
          <div className="inline-flex items-center gap-1 bg-card border rounded-xl p-1 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-bold px-2 whitespace-nowrap min-w-[120px] text-center">
              {format(selectedDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isSameMonth(selectedDate, new Date()) && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 rounded-lg ml-1 font-semibold cursor-pointer"
                onClick={handleCurrentMonth}
              >
                Today
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMonthlyPayments(selectedDate, true)}
            disabled={syncing}
            className="h-9 rounded-xl font-bold text-xs cursor-pointer"
            title="Automatically check all active students and generate missing payments for this month"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Active Students
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setAddPaymentForm({
                student_id: '',
                student_name: '',
                amount: '',
                currency: 'BRL',
                due_date: format(selectedDate, 'yyyy-MM-dd'),
                status: 'pending',
              });
              setIsAddPaymentOpen(true);
            }}
            className="h-9 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Payment
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 font-bold text-xs">
            <Link to="/admin/expenses">
              <TrendingDown className="w-4 h-4 mr-1.5" />
              Manage Expenses
            </Link>
          </Button>
        </div>
      </div>

      {/* GLOBAL TOTAL */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-green-200 dark:border-emerald-800/40">
        <CardContent className="p-6 flex flex-col items-center text-center relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              <Settings className="h-5 w-5 text-green-800 dark:text-emerald-300" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowTotal(!showTotal)}>
              {showTotal ? <EyeOff className="h-5 w-5 text-green-800 dark:text-emerald-300" /> : <Eye className="h-5 w-5 text-green-800 dark:text-emerald-300" />}
            </Button>
          </div>
          <p className="text-sm font-medium text-green-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
            Total Revenue (Global)
          </p>
          
          <div className="mb-4">
            <Tabs value={globalCurrency} onValueChange={setGlobalCurrency} className="w-[300px] mx-auto">
              <TabsList className="grid w-full grid-cols-3 bg-green-100/60 dark:bg-slate-900/80">
                <TabsTrigger value="BRL">BRL</TabsTrigger>
                <TabsTrigger value="USD">USD</TabsTrigger>
                <TabsTrigger value="CAD">CAD</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <h3 className="text-4xl font-extrabold text-green-700 dark:text-emerald-400">
            {(() => {
              if (!showTotal) return '****';
              const totalInBRL = totals.BRL + (totals.USD * rates.USD) + (totals.EUR * rates.EUR) + (totals.CAD * rates.CAD);
              
              if (globalCurrency === 'BRL') return `R$ ${totalInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              if (globalCurrency === 'USD') return `$ ${(totalInBRL / rates.USD).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
              if (globalCurrency === 'CAD') return `C$ ${(totalInBRL / rates.CAD).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
              return '';
            })()}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">
            *Conversion rates: USD {rates.USD}, EUR {rates.EUR}, CAD {rates.CAD}
          </p>

          {isSettingsOpen && (
            <div className="mt-6 p-4 bg-white/80 dark:bg-slate-900/90 border border-green-200 dark:border-emerald-800/40 rounded-lg w-full max-w-sm flex flex-col gap-3 shadow-inner">
              <div className="text-sm font-semibold text-left text-green-900 dark:text-emerald-200 mb-1">Exchange Rates (to BRL)</div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium">1 USD =</label>
                <input type="number" step="0.01" className="flex-1 rounded-md border-green-200 dark:border-emerald-700 bg-background border p-2 text-sm focus:ring-green-500 focus:border-green-500" value={rates.USD} onChange={e => setRates({...rates, USD: parseFloat(e.target.value) || 0})} />
                <span className="text-sm text-muted-foreground w-8">BRL</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium">1 EUR =</label>
                <input type="number" step="0.01" className="flex-1 rounded-md border-green-200 dark:border-emerald-700 bg-background border p-2 text-sm focus:ring-green-500 focus:border-green-500" value={rates.EUR} onChange={e => setRates({...rates, EUR: parseFloat(e.target.value) || 0})} />
                <span className="text-sm text-muted-foreground w-8">BRL</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium">1 CAD =</label>
                <input type="number" step="0.01" className="flex-1 rounded-md border-green-200 dark:border-emerald-700 bg-background border p-2 text-sm focus:ring-green-500 focus:border-green-500" value={rates.CAD} onChange={e => setRates({...rates, CAD: parseFloat(e.target.value) || 0})} />
                <span className="text-sm text-muted-foreground w-8">BRL</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency Totals */}
      <div>
        <h3 className="text-lg font-medium mb-4">
          Monthly Stats ({format(selectedDate, 'MMMM yyyy')})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">TOTAL BRL (R$)</p>
              <p className="text-2xl font-bold text-primary">
                {showTotal ? `R$ ${totals.BRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '****'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">TOTAL USD ($)</p>
              <p className="text-2xl font-bold text-success">
                {showTotal ? `$${totals.USD.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '****'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">TOTAL EUR (€)</p>
              <p className="text-2xl font-bold text-warning">
                {showTotal ? `${totals.EUR.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` : '****'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">TOTAL CAD (C$)</p>
              <p className="text-2xl font-bold text-primary">
                {showTotal ? `$${totals.CAD.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : '****'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RECONCILIATION BANNER FOR PAID PAYMENTS WITH PAST DATES */}
      {pastPaidNeedsMove.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
                    !
                  </span>
                  <h4 className="font-semibold text-sm sm:text-base text-amber-950 dark:text-amber-200">
                    {pastPaidNeedsMove.length} Paid Payment{pastPaidNeedsMove.length > 1 ? 's' : ''} Recorded in Prior Months
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-amber-900/80 dark:text-amber-300/80">
                  Payments marked as paid with older due dates ({Array.from(new Set(pastPaidNeedsMove.map(p => p.student_name))).slice(0, 3).join(', ')}{pastPaidNeedsMove.length > 3 ? '...' : ''}) are currently registered in past months, so they are not counting towards {format(selectedDate, 'MMMM yyyy')} total revenue.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleMoveAllPastPaidToCurrentMonth(pastPaidNeedsMove)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Count in {format(selectedDate, 'MMM yyyy')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPastPaidModalOpen(true)}
                  className="border-amber-300 text-amber-900 dark:border-amber-700 dark:text-amber-200 text-xs font-semibold cursor-pointer"
                >
                  Review ({pastPaidNeedsMove.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments List */}
      <div>
        <Tabs defaultValue="pending" className="w-full">
          <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4 mb-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="pending">
                Pending Payments
                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {showStopped ? allRawPending.length : pendingPayments.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid Payments
                <span className="ml-2 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  {paidPayments.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-background"
              />

              <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={showStopped}
                  onChange={(e) => setShowStopped(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <span>Show stopped students</span>
              </label>
            </div>
          </div>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STUDENT</TableHead>
                      <TableHead>DUE DATE</TableHead>
                      <TableHead>AMOUNT</TableHead>
                      <TableHead>ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showStopped ? allRawPending : pendingPayments).filter(p => (p.student_name || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No pending payments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (showStopped ? allRawPending : pendingPayments)
                        .filter(p => (p.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {payment.student_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                              <span className="font-medium">
                                {payment.due_date ? format(parseISO(payment.due_date), 'MMM d, yyyy') : 'No date'}
                              </span>
                              {(payment.isOverdue || isOverdue(payment.due_date)) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 w-fit">
                                  Overdue ({payment.due_date ? format(parseISO(payment.due_date), 'MMM yyyy') : 'Past'})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell className="flex gap-2 flex-wrap items-center">
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 flex-1 cursor-pointer font-semibold"
                              onClick={() => handleMarkAsPaid(payment)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark as Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2"
                              title="Change Due Date"
                              onClick={() => handleOpenEditDate(payment)}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="px-2"
                              title="Delete Payment"
                              onClick={() => handleDeletePayment(payment)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="px-2 whitespace-nowrap"
                              title="Permanently Delete Student"
                              onClick={() => handleDeleteStudent(payment)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Student
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paid">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STUDENT</TableHead>
                      <TableHead>DUE DATE</TableHead>
                      <TableHead>AMOUNT</TableHead>
                      <TableHead>ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidPayments.filter(p => (p.student_name || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No paid payments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paidPayments
                        .filter(p => (p.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {payment.student_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {payment.due_date ? format(parseISO(payment.due_date), 'MMM d, yyyy') : 'No date'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell className="flex gap-2 flex-wrap items-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 cursor-pointer font-semibold"
                              onClick={() => handleUndo(payment)}
                            >
                              <Undo2 className="w-4 h-4 mr-2" />
                              Undo Payment
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2"
                              title="Change Due Date / Move Month"
                              onClick={() => handleOpenEditDate(payment)}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="px-2"
                              title="Delete Payment"
                              onClick={() => handleDeletePayment(payment)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="px-2 whitespace-nowrap"
                              title="Permanently Delete Student"
                              onClick={() => handleDeleteStudent(payment)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Student
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ADD / RECORD PAYMENT MODAL */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add / Record Student Payment</DialogTitle>
            <DialogDescription>
              Create a payment entry for a student for {format(selectedDate, 'MMMM yyyy')} or any custom date.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Student</Label>
              <Select
                value={addPaymentForm.student_id}
                onValueChange={handleSelectStudentForAdd}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose an active student..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.student_name} {s.payment_amount ? `(${s.currency || 'BRL'} ${s.payment_amount})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Student Name</Label>
              <Input
                placeholder="Student name"
                value={addPaymentForm.student_name}
                onChange={e => setAddPaymentForm({ ...addPaymentForm, student_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="300.00"
                  value={addPaymentForm.amount}
                  onChange={e => setAddPaymentForm({ ...addPaymentForm, amount: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={addPaymentForm.currency}
                  onValueChange={(val: any) => setAddPaymentForm({ ...addPaymentForm, currency: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={addPaymentForm.due_date}
                  onChange={e => setAddPaymentForm({ ...addPaymentForm, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Initial Status</Label>
                <Select
                  value={addPaymentForm.status}
                  onValueChange={(val: any) => setAddPaymentForm({ ...addPaymentForm, status: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomPayment} className="font-bold">
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* REVIEW PAST PAID PAYMENTS MODAL */}
      <Dialog open={isPastPaidModalOpen} onOpenChange={setIsPastPaidModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Payments Paid with Past Dates</DialogTitle>
            <DialogDescription>
              These payments are marked as <strong>paid</strong>, but their registered due dates belong to past months. 
              Assign them to <strong>{format(selectedDate, 'MMMM yyyy')}</strong> so they count towards this month's revenue and appear in Paid Payments.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {pastPaidNeedsMove.length} payment{pastPaidNeedsMove.length === 1 ? '' : 's'} found
              </span>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                onClick={() => handleMoveAllPastPaidToCurrentMonth(pastPaidNeedsMove)}
              >
                Move All to {format(selectedDate, 'MMM yyyy')}
              </Button>
            </div>

            <div className="space-y-2">
              {pastPaidNeedsMove.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card gap-2"
                >
                  <div>
                    <p className="font-semibold text-sm">{p.student_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {p.due_date ? format(parseISO(p.due_date), 'MMM d, yyyy') : 'No date'} • Amount: {formatCurrency(p.amount, p.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold cursor-pointer"
                      onClick={() => handleMoveSinglePayment(p)}
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-1" />
                      Move to {format(selectedDate, 'MMM yyyy')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2 cursor-pointer"
                      title="Delete duplicate payment"
                      onClick={() => handleDeletePayment(p)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPastPaidModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT PAYMENT DUE DATE MODAL */}
      <Dialog open={isEditDateOpen} onOpenChange={setIsEditDateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Billing Date</DialogTitle>
            <DialogDescription>
              Change the due date for {editingPayment?.student_name || 'student'}. Moving it into {format(selectedDate, 'MMMM yyyy')} will include it in this month's stats.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Input value={editingPayment?.student_name || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditDateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePaymentDate} className="font-bold cursor-pointer">
              Save Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
