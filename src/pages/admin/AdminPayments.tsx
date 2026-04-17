import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase, Payment } from '@/lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
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
import { Undo2, CheckCircle2, Trash2, Eye, EyeOff } from 'lucide-react';

interface PaymentWithStudent extends Payment {
  student_name?: string;
}

const AdminPayments: React.FC = () => {
  const [pendingPayments, setPendingPayments] = useState<PaymentWithStudent[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTotal, setShowTotal] = useState(true);
  const [totals, setTotals] = useState<Record<string, number>>({
    BRL: 0,
    USD: 0,
    EUR: 0,
    CAD: 0,
  });

  const fetchPayments = async () => {
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      // Fetch all payments for current month
      const { data: allPayments, error: allError } = await supabase
        .from('payments')
        .select('*')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: true });

      if (allError) throw allError;

      // Calculate totals by currency
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

      // Filter pending and paid payments
      const pending = (allPayments || []).filter((p) => p.status === 'pending');
      const paid = (allPayments || []).filter((p) => p.status === 'paid');

      // Sort paid payments by recently updated/due date descending for better UX
      paid.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

      setPendingPayments(pending);
      setPaidPayments(paid);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleMarkAsPaid = async (payment: PaymentWithStudent) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', payment.id);

      if (error) throw error;

      toast.success(`Payment marked as paid`);
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
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
      fetchPayments();
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
      fetchPayments();
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-semibold">Administrator Panel</h2>
        <p className="text-muted-foreground">Payment Management</p>
      </div>

      {/* GLOBAL TOTAL */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6 flex flex-col items-center text-center relative">
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" onClick={() => setShowTotal(!showTotal)}>
              {showTotal ? <EyeOff className="h-5 w-5 text-green-800" /> : <Eye className="h-5 w-5 text-green-800" />}
            </Button>
          </div>
          <p className="text-sm font-medium text-green-800 uppercase tracking-wider mb-1">
            Total Revenue (Global)
          </p>
          <h3 className="text-4xl font-extrabold text-green-700">
            {showTotal 
              ? `R$ ${((totals.BRL) + (totals.USD * 5.20) + (totals.EUR * 6.20) + (totals.CAD * 3.80)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'R$ ****'}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">
            *Approximate conversion: USD 5.20, EUR 6.20, CAD 3.80
          </p>
        </CardContent>
      </Card>

      {/* Currency Totals */}
      <div>
        <h3 className="text-lg font-medium mb-4">Current Month Stats (by Currency)</h3>
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

      {/* Payments List */}
      <div>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pending">
              Pending Payments
              <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {pendingPayments.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="paid">
              Paid Payments
              <span className="ml-2 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                {paidPayments.length}
              </span>
            </TabsTrigger>
          </TabsList>

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
                    {pendingPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No pending payments this month 🎉
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingPayments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {payment.student_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 flex-1"
                              onClick={() => handleMarkAsPaid(payment)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark as Paid
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
                    {paidPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No payments have been marked as paid this month yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paidPayments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {payment.student_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleUndo(payment)}
                            >
                              <Undo2 className="w-4 h-4 mr-2" />
                              Undo Payment
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
    </div>
  );
};

export default AdminPayments;
