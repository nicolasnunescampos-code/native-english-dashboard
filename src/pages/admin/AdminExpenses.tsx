import React, { useEffect, useState, useMemo } from 'react';
import { supabase, Expense } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
  Repeat,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
  Wallet,
  CreditCard,
  Sparkles,
  PieChart,
  Building2,
  Landmark,
} from 'lucide-react';

const CATEGORIES = [
  'Subscriptions',
  'Teacher Payments',
  'Marketing & Ads',
  'Software & Tools',
  'Salaries & Team',
  'Taxes & Fees',
  'Office & Supplies',
  'Other',
];

const PAYMENT_METHODS = [
  "Company's Nubank",
  "Nicolas's Personal Acc",
  "Company Credit Card",
  "InfinitePay",
  "Wise / International",
  "Cash",
  "Other",
] as const;

export const getExpensePaymentMethod = (exp: Expense): string => {
  if (exp.payment_method && exp.payment_method.trim()) return exp.payment_method;
  if (exp.notes) {
    const match = exp.notes.match(/^\[Paid via:\s*([^\]]+)\]/i);
    if (match) return match[1].trim();
  }
  return "Company's Nubank";
};

export const getDisplayNotes = (notes?: string | null): string => {
  if (!notes) return '';
  return notes.replace(/^\[Paid via:\s*[^\]]+\]\s*/i, '').trim();
};

export const getAccountBadgeStyle = (method: string) => {
  const m = method.toLowerCase();
  if (m.includes('personal') || m.includes('nicolas')) {
    return 'bg-amber-100/90 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300/80';
  }
  if (m.includes('nubank')) {
    return 'bg-purple-100/90 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300/80';
  }
  if (m.includes('infinitepay') || m.includes('infinite')) {
    return 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300/80';
  }
  if (m.includes('credit card') || m.includes('cartao') || m.includes('cartão')) {
    return 'bg-blue-100/90 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300/80';
  }
  if (m.includes('wise') || m.includes('international')) {
    return 'bg-cyan-100/90 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-300/80';
  }
  if (m.includes('cash') || m.includes('dinheiro')) {
    return 'bg-stone-100 text-stone-800 dark:bg-stone-900/60 dark:text-stone-300 border-stone-300';
  }
  return 'bg-muted/80 text-foreground border-border';
};

const CURRENCIES = ['BRL', 'USD', 'EUR', 'CAD'] as const;

export default function AdminExpenses() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [columnMissing, setColumnMissing] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending'>('all');
  const [breakdownView, setBreakdownView] = useState<'category' | 'account'>('category');

  // Revenue & Teacher Payroll stats for the month
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [teacherPayrollTotal, setTeacherPayrollTotal] = useState(0);
  const [teachersBreakdown, setTeachersBreakdown] = useState<{ name: string; amount: number; count: number }[]>([]);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSyncPayrollOpen, setIsSyncPayrollOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    category: string;
    amount: string;
    currency: 'BRL' | 'USD' | 'EUR' | 'CAD';
    due_date: string;
    status: 'paid' | 'pending';
    payment_method: string;
    custom_payment_method: string;
    is_recurring: boolean;
    notes: string;
  }>({
    title: '',
    category: 'Subscriptions',
    amount: '',
    currency: 'BRL',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'paid',
    payment_method: "Company's Nubank",
    custom_payment_method: '',
    is_recurring: false,
    notes: '',
  });

  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Load all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Expenses for the month
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: false });

      if (expError) {
        if (expError.code === '42P01' || expError.code === 'PGRST205') {
          setTableMissing(true);
        } else {
          throw expError;
        }
      } else {
        setTableMissing(false);
        setExpenses(expData || []);
      }

      // 2. Fetch Student Revenue for this month (paid payments)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, currency, status')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .eq('status', 'paid');

      let revenueBRL = 0;
      const rates = { USD: 5.2, EUR: 6.2, CAD: 3.8 };
      (paymentsData || []).forEach((p) => {
        if (p.currency === 'BRL') revenueBRL += p.amount;
        else if (p.currency === 'USD') revenueBRL += p.amount * rates.USD;
        else if (p.currency === 'EUR') revenueBRL += p.amount * rates.EUR;
        else if (p.currency === 'CAD') revenueBRL += p.amount * rates.CAD;
      });
      setMonthlyRevenue(revenueBRL);

      // 3. Compute Teacher Payroll for this month from classes & rates
      const { data: teachersData } = await supabase
        .from('teachers')
        .select('id, name, class_rate');

      const { data: classesData } = await supabase
        .from('classes')
        .select('title, date, time, class_grade, is_absent')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .not('class_grade', 'is', null);

      if (teachersData && classesData) {
        let totalPayroll = 0;
        const breakdown: { name: string; amount: number; count: number }[] = [];

        teachersData.forEach((t) => {
          const tClasses = classesData.filter((c) => {
            const parts = (c.title || '').split(' - ');
            const tName = parts.length > 1 ? parts[1].trim().toLowerCase() : (c.title || '').toLowerCase();
            return tName.includes(t.name.toLowerCase());
          });

          // Unique sessions
          const sessions = new Set(tClasses.map((c) => `${c.date}_${c.time}`));
          const count = sessions.size;
          const rate = t.class_rate || 0;
          const pay = count * rate;

          if (count > 0) {
            totalPayroll += pay;
            breakdown.push({ name: t.name, amount: pay, count });
          }
        });

        setTeacherPayrollTotal(totalPayroll);
        setTeachersBreakdown(breakdown);
      }
    } catch (err) {
      console.error('Error fetching financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthStart, monthEnd]);

  // Date Navigation
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToCurrentMonth = () => setCurrentDate(new Date());

  // Calculations
  const totalExpensesBRL = useMemo(() => {
    const rates = { USD: 5.2, EUR: 6.2, CAD: 3.8 };
    return expenses.reduce((sum, exp) => {
      let val = Number(exp.amount) || 0;
      if (exp.currency === 'USD') val *= rates.USD;
      else if (exp.currency === 'EUR') val *= rates.EUR;
      else if (exp.currency === 'CAD') val *= rates.CAD;
      return sum + val;
    }, 0);
  }, [expenses]);

  const netProfit = monthlyRevenue - totalExpensesBRL;
  const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Account / Payment Method breakdown
  const accountStats = useMemo(() => {
    const map: Record<string, number> = {};
    const rates = { USD: 5.2, EUR: 6.2, CAD: 3.8 };
    expenses.forEach((e) => {
      const method = getExpensePaymentMethod(e);
      let val = Number(e.amount) || 0;
      if (e.currency === 'USD') val *= rates.USD;
      else if (e.currency === 'EUR') val *= rates.EUR;
      else if (e.currency === 'CAD') val *= rates.CAD;
      map[method] = (map[method] || 0) + val;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Total spent from personal account (e.g. Nicolas's personal acc) for reimbursements
  const personalAccountTotal = useMemo(() => {
    const rates = { USD: 5.2, EUR: 6.2, CAD: 3.8 };
    return expenses.reduce((sum, e) => {
      const m = getExpensePaymentMethod(e).toLowerCase();
      if (m.includes('personal') || m.includes('nicolas')) {
        let val = Number(e.amount) || 0;
        if (e.currency === 'USD') val *= rates.USD;
        else if (e.currency === 'EUR') val *= rates.EUR;
        else if (e.currency === 'CAD') val *= rates.CAD;
        return sum + val;
      }
      return sum;
    }, 0);
  }, [expenses]);

  // Distinct list of accounts seen in current expenses + defaults
  const allKnownAccounts = useMemo(() => {
    const set = new Set<string>();
    (PAYMENT_METHODS as readonly string[]).filter((m) => m !== 'Other').forEach((m) => set.add(m));
    expenses.forEach((e) => {
      const m = getExpensePaymentMethod(e);
      if (m) set.add(m);
    });
    return Array.from(set);
  }, [expenses]);

  // Filtered expenses table list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (activeTab === 'paid' && e.status !== 'paid') return false;
      if (activeTab === 'pending' && e.status !== 'pending') return false;
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      if (selectedPaymentMethod !== 'all' && getExpensePaymentMethod(e) !== selectedPaymentMethod) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(query);
        const matchesNotes = (e.notes || '').toLowerCase().includes(query);
        const matchesMethod = getExpensePaymentMethod(e).toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesMethod) return false;
      }
      return true;
    });
  }, [expenses, activeTab, selectedCategory, selectedPaymentMethod, searchQuery]);

  // Form Handlers
  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'Subscriptions',
      amount: '',
      currency: 'BRL',
      due_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'paid',
      payment_method: "Company's Nubank",
      custom_payment_method: '',
      is_recurring: false,
      notes: '',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const method = getExpensePaymentMethod(expense);
    const isPreset = (PAYMENT_METHODS as readonly string[]).filter((m) => m !== 'Other').includes(method);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      currency: expense.currency,
      due_date: expense.due_date,
      status: expense.status,
      payment_method: isPreset ? method : 'Other',
      custom_payment_method: isPreset ? '' : method,
      is_recurring: !!expense.is_recurring,
      notes: getDisplayNotes(expense.notes),
    });
    setIsEditOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid title and positive amount.');
      return;
    }

    const finalPaymentMethod =
      formData.payment_method === 'Other'
        ? (formData.custom_payment_method.trim() || 'Other')
        : formData.payment_method;

    try {
      if (editingExpense) {
        const updatePayload: any = {
          title: formData.title.trim(),
          category: formData.category,
          amount: parsedAmount,
          currency: formData.currency,
          due_date: formData.due_date,
          status: formData.status,
          payment_method: finalPaymentMethod,
          is_recurring: formData.is_recurring,
          notes: formData.notes.trim() || null,
        };

        const { error } = await supabase
          .from('expenses')
          .update(updatePayload)
          .eq('id', editingExpense.id);

        if (error) {
          // If payment_method column missing in Supabase (error 42703)
          if (error.code === '42703' || error.message?.includes('payment_method')) {
            console.warn('payment_method column missing in Supabase, retrying with fallback note...');
            setColumnMissing(true);
            const fallbackNotes = formData.notes.trim()
              ? `[Paid via: ${finalPaymentMethod}] ${formData.notes.trim()}`
              : `[Paid via: ${finalPaymentMethod}]`;

            delete updatePayload.payment_method;
            updatePayload.notes = fallbackNotes;

            const retry = await supabase
              .from('expenses')
              .update(updatePayload)
              .eq('id', editingExpense.id);

            if (retry.error) throw retry.error;

            toast.warning(
              'Expense updated! Note: payment_method column not yet added to Supabase. Click "Copy SQL Snippet" above to enable dedicated DB column.',
              { duration: 6000 }
            );
            setIsEditOpen(false);
            fetchData();
            return;
          }
          throw error;
        }

        toast.success('Expense updated successfully');
        setIsEditOpen(false);
      } else {
        const insertPayload: any = {
          title: formData.title.trim(),
          category: formData.category,
          amount: parsedAmount,
          currency: formData.currency,
          due_date: formData.due_date,
          status: formData.status,
          payment_method: finalPaymentMethod,
          is_recurring: formData.is_recurring,
          notes: formData.notes.trim() || null,
        };

        const { error } = await supabase.from('expenses').insert(insertPayload);

        if (error) {
          // If payment_method column missing in Supabase (error 42703)
          if (error.code === '42703' || error.message?.includes('payment_method')) {
            console.warn('payment_method column missing in Supabase, retrying with fallback note...');
            setColumnMissing(true);
            const fallbackNotes = formData.notes.trim()
              ? `[Paid via: ${finalPaymentMethod}] ${formData.notes.trim()}`
              : `[Paid via: ${finalPaymentMethod}]`;

            delete insertPayload.payment_method;
            insertPayload.notes = fallbackNotes;

            const retry = await supabase.from('expenses').insert(insertPayload);
            if (retry.error) throw retry.error;

            toast.warning(
              'Expense added! Note: payment_method column not yet added to Supabase. Click "Copy SQL Snippet" above to enable dedicated DB column.',
              { duration: 6000 }
            );
            setIsAddOpen(false);
            fetchData();
            return;
          }
          throw error;
        }

        toast.success('Expense added successfully');
        setIsAddOpen(false);
      }
      fetchData();
    } catch (err: any) {
      console.error('Error saving expense:', err);
      toast.error(err.message || 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Expense deleted');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      toast.error('Failed to delete expense');
    }
  };

  const handleToggleStatus = async (expense: Expense) => {
    const newStatus = expense.status === 'paid' ? 'pending' : 'paid';
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', expense.id);

      if (error) throw error;
      toast.success(`Expense marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Sync Teacher Payroll into Expenses
  const handleSyncTeacherPayroll = async () => {
    if (teacherPayrollTotal <= 0) {
      toast.error('No teacher payroll found for this month.');
      return;
    }

    try {
      const existingPayroll = expenses.find(
        (e) => e.category === 'Teacher Payments' && e.title.includes('Teacher Payroll')
      );

      const title = `Teacher Payroll (${format(currentDate, 'MMMM yyyy')})`;

      if (existingPayroll) {
        let updatePayroll: any = {
          amount: teacherPayrollTotal,
          due_date: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
          status: 'paid',
          payment_method: "Company's Nubank",
          notes: `Calculated from ${teachersBreakdown.length} active teachers.`,
        };
        let { error } = await supabase
          .from('expenses')
          .update(updatePayroll)
          .eq('id', existingPayroll.id);

        if (error && (error.code === '42703' || error.message?.includes('payment_method'))) {
          delete updatePayroll.payment_method;
          updatePayroll.notes = `[Paid via: Company's Nubank] Calculated from ${teachersBreakdown.length} active teachers.`;
          const retry = await supabase.from('expenses').update(updatePayroll).eq('id', existingPayroll.id);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
        toast.success('Teacher payroll expense updated!');
      } else {
        let insertPayroll: any = {
          title,
          category: 'Teacher Payments',
          amount: teacherPayrollTotal,
          currency: 'BRL',
          due_date: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
          status: 'paid',
          payment_method: "Company's Nubank",
          is_recurring: true,
          notes: `Calculated from ${teachersBreakdown.length} active teachers.`,
        };
        let { error } = await supabase.from('expenses').insert(insertPayroll);

        if (error && (error.code === '42703' || error.message?.includes('payment_method'))) {
          delete insertPayroll.payment_method;
          insertPayroll.notes = `[Paid via: Company's Nubank] Calculated from ${teachersBreakdown.length} active teachers.`;
          const retry = await supabase.from('expenses').insert(insertPayroll);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
        toast.success('Teacher payroll logged as expense!');
      }

      setIsSyncPayrollOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error syncing payroll:', err);
      toast.error('Failed to sync teacher payroll.');
    }
  };

  const copyColumnSql = () => {
    const sql = `ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Company Nubank';`;
    navigator.clipboard.writeText(sql);
    toast.success('SQL snippet copied to clipboard!');
  };

  const copySql = () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid',
    payment_method TEXT DEFAULT 'Company Nubank',
    is_recurring BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- If you already created the expenses table previously, run this one line to add payment_method:
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Company Nubank';

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all" ON public.expenses FOR DELETE USING (true);`;
    navigator.clipboard.writeText(sql);
    toast.success('SQL migration copied to clipboard!');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Table Missing Alert Banner */}
      {tableMissing && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Expenses Table Not Created Yet</p>
                <p className="text-xs opacity-90 mt-0.5">
                  To start tracking expenses in Supabase, run the migration script in your Supabase SQL Editor.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copySql}
              className="border-amber-400 bg-white dark:bg-amber-900 hover:bg-amber-100 text-xs shrink-0"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy SQL Script
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Column Missing Alert Banner */}
      {columnMissing && (
        <Card className="border-blue-300 bg-blue-50/70 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Save Accounts Directly in Supabase</p>
                <p className="text-xs opacity-90 mt-0.5">
                  Your expenses are safely saved. To enable dedicated database column tracking for payment accounts, run the SQL command below.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyColumnSql}
              className="border-blue-400 bg-white dark:bg-blue-900 hover:bg-blue-100 text-xs shrink-0 font-medium"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy SQL Snippet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header and Month Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            Company Expenses & Finances
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor subscriptions, teacher payroll, software, and company net profit.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-card border rounded-xl p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs sm:text-sm font-semibold px-3 min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={goToCurrentMonth} className="rounded-xl h-10 text-xs">
            Current Month
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSyncPayrollOpen(true)}
            className="rounded-xl h-10 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Wallet className="w-4 h-4 mr-1.5" />
            Sync Teacher Payroll
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="rounded-xl h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Income
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Student Tuitions Paid</p>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Expenses
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
              R$ {totalExpensesBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} expenses logged</p>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Net Profit
              </span>
              <div
                className={`p-2 rounded-xl ${
                  netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold mt-2 ${
                netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge
                variant="secondary"
                className={`text-[11px] font-semibold ${
                  netProfit >= 0 ? 'text-emerald-700 bg-emerald-100/60' : 'text-rose-700 bg-rose-100/60'
                }`}
              >
                {profitMargin.toFixed(1)}% Margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Payroll Card */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Teacher Payroll
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              R$ {teacherPayrollTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {teachersBreakdown.length} active teachers this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Personal Account Reimbursement Banner */}
      {personalAccountTotal > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 rounded-2xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/25 dark:border-amber-900/40 text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-amber-950 dark:text-amber-200">
              <strong>Personal Account Payments:</strong> You paid a total of{' '}
              <strong className="text-amber-800 dark:text-amber-300 text-sm">
                R$ {personalAccountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>{' '}
              from your personal account this month (to be reimbursed by company).
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPaymentMethod(
                selectedPaymentMethod === "Nicolas's Personal Acc" ? 'all' : "Nicolas's Personal Acc"
              );
              setBreakdownView('account');
            }}
            className="border-amber-300 bg-white dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 h-8 text-xs font-semibold shrink-0"
          >
            {selectedPaymentMethod === "Nicolas's Personal Acc" ? 'Show All Accounts' : 'Filter Personal Expenses'}
          </Button>
        </div>
      )}

      {/* Category & Account Breakdown Chips */}
      {(categoryStats.length > 0 || accountStats.length > 0) && (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {breakdownView === 'category' ? (
                  <>
                    <PieChart className="w-3.5 h-3.5 text-primary" />
                    Expenses by Category
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    Expenses by Account / Paid Via
                  </>
                )}
              </h4>

              <div className="flex items-center bg-muted/60 p-1 rounded-xl border text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setBreakdownView('category')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    breakdownView === 'category'
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Category ({categoryStats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownView('account')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    breakdownView === 'account'
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Account ({accountStats.length})
                </button>
              </div>
            </div>

            {breakdownView === 'category' ? (
              <div className="flex flex-wrap gap-2">
                {categoryStats.map(([cat, amount]) => {
                  const pct = totalExpensesBRL > 0 ? ((amount / totalExpensesBRL) * 100).toFixed(0) : 0;
                  return (
                    <div
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 hover:bg-muted border-border'
                      }`}
                    >
                      <span className="font-semibold">{cat}</span>
                      <span className="font-bold">
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="opacity-70 text-[10px]">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accountStats.map(([acc, amount]) => {
                  const pct = totalExpensesBRL > 0 ? ((amount / totalExpensesBRL) * 100).toFixed(0) : 0;
                  const badgeClass = getAccountBadgeStyle(acc);
                  const isSelected = selectedPaymentMethod === acc;
                  return (
                    <div
                      key={acc}
                      onClick={() => setSelectedPaymentMethod(isSelected ? 'all' : acc)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : `${badgeClass} hover:opacity-90`
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="font-semibold">{acc}</span>
                      <span className="font-bold">
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="opacity-70 text-[10px]">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expenses Table Controls */}
      <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="bg-muted/70 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs font-semibold">
                All ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="rounded-lg text-xs font-semibold">
                Paid ({expenses.filter((e) => e.status === 'paid').length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold">
                Pending ({expenses.filter((e) => e.status === 'pending').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px] rounded-xl text-xs h-9 bg-card">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger className="w-[170px] rounded-xl text-xs h-9 bg-card">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {allKnownAccounts.map((pm) => (
                  <SelectItem key={pm} value={pm}>
                    {pm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[180px] rounded-xl text-xs h-9 bg-card"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Expense Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid Via / Account</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading expenses...
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="font-semibold text-foreground">No expenses found for this period</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "+ Add Expense" or sync your teacher payroll above.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            {exp.title}
                            {exp.is_recurring && (
                              <span title="Monthly recurring">
                                <Repeat className="w-3.5 h-3.5 text-blue-500" />
                              </span>
                            )}
                          </p>
                          {getDisplayNotes(exp.notes) && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {getDisplayNotes(exp.notes)}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {exp.category}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {(() => {
                        const method = getExpensePaymentMethod(exp);
                        const badgeClass = getAccountBadgeStyle(method);
                        return (
                          <Badge
                            variant="outline"
                            className={`text-xs font-normal gap-1.5 py-0.5 px-2.5 whitespace-nowrap ${badgeClass}`}
                          >
                            <CreditCard className="w-3 h-3 shrink-0 opacity-75" />
                            <span className="truncate max-w-[140px]">{method}</span>
                          </Badge>
                        );
                      })()}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(exp.due_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </TableCell>

                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(exp)}
                        className="cursor-pointer"
                        title="Click to toggle status"
                      >
                        {exp.status === 'paid' ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1 text-amber-600 bg-amber-50">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        )}
                      </button>
                    </TableCell>

                    <TableCell className="text-right font-bold text-sm whitespace-nowrap">
                      <span className="text-rose-600">
                        {exp.currency} {Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(exp)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit Expense Dialog */}
      <Dialog
        open={isAddOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>
              {isEditOpen
                ? 'Update the details for this operational expense.'
                : 'Log a new company expense, subscription, or software cost.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4 py-2">
            <div>
              <Label htmlFor="exp-title" className="text-xs font-semibold">
                Expense Title *
              </Label>
              <Input
                id="exp-title"
                placeholder="e.g. Zoom Pro, Canva Team, Meta Ads"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exp-amount" className="text-xs font-semibold">
                  Amount *
                </Label>
                <Input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="mt-1 rounded-xl text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(val: any) => setFormData({ ...formData, currency: val })}
                >
                  <SelectTrigger className="mt-1 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((cur) => (
                      <SelectItem key={cur} value={cur}>
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="mt-1 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  Paid Via / Account
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                >
                  <SelectTrigger className="mt-1 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {pm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.payment_method === 'Other' && (
              <div>
                <Label htmlFor="custom-pm" className="text-xs font-semibold">
                  Custom Account / Payment Method Name *
                </Label>
                <Input
                  id="custom-pm"
                  placeholder="e.g. PayPal, Itaú Business, Stripe..."
                  value={formData.custom_payment_method}
                  onChange={(e) => setFormData({ ...formData, custom_payment_method: e.target.value })}
                  required
                  className="mt-1 rounded-xl text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exp-date" className="text-xs font-semibold">
                  Date / Due Date
                </Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  className="mt-1 rounded-xl text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="mt-1 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="exp-recurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <Label htmlFor="exp-recurring" className="text-xs font-medium cursor-pointer">
                Monthly recurring expense
              </Label>
            </div>

            <div>
              <Label htmlFor="exp-notes" className="text-xs font-semibold">
                Notes / Link (Optional)
              </Label>
              <Textarea
                id="exp-notes"
                placeholder="Invoice number, link, or details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="mt-1 rounded-xl text-sm resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setIsEditOpen(false);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {isEditOpen ? 'Update Expense' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sync Teacher Payroll Modal */}
      <Dialog open={isSyncPayrollOpen} onOpenChange={setIsSyncPayrollOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              Sync Teacher Payroll for {format(currentDate, 'MMMM yyyy')}
            </DialogTitle>
            <DialogDescription>
              Automatically log the calculated teacher payments from completed classes as an operational expense.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Total Calculated Payroll
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-1">
                R$ {teacherPayrollTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Breakdown by Teacher ({teachersBreakdown.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-xl p-3 text-xs divide-y divide-border/60">
                {teachersBreakdown.length === 0 ? (
                  <p className="text-muted-foreground py-2 text-center">No graded classes found this month.</p>
                ) : (
                  teachersBreakdown.map((tb) => (
                    <div key={tb.name} className="pt-1.5 first:pt-0 flex items-center justify-between">
                      <span className="font-medium text-foreground">{tb.name} ({tb.count} classes)</span>
                      <span className="font-bold">
                        R$ {tb.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSyncPayrollOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSyncTeacherPayroll}
              disabled={teacherPayrollTotal <= 0}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Log / Update in Expenses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
