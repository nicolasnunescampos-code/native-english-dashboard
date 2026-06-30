import React, { useEffect, useState } from 'react';
import { supabase, Payment } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

const StudentPayments: React.FC = () => {
  const { studentName } = useAuth();

  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number, currency: string = 'BRL') =>
    new Intl.NumberFormat(
      currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'de-DE' : 'en-US',
      {
        style: 'currency',
        currency: currency,
      }
    ).format(amount);

  const isSameMonth = (date: string) => {
    if (!date) return false;
    const [year, month] = date.split('-');
    const now = new Date();
    return parseInt(year, 10) === now.getFullYear() && parseInt(month, 10) === now.getMonth() + 1;
  };

  useEffect(() => {
    const fetchCurrentPayment = async () => {
      if (!studentName) return;

      try {
        // Fetch student profile to get their preferred currency
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('currency')
          .eq('student_name', studentName)
          .single();

        const studentCurrency = studentData?.currency || 'BRL';

        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('student_name', studentName)
          .order('due_date', { ascending: false });

        if (error) throw error;
        if (!data) return;

        const currentMonthPayments = data.filter(p => isSameMonth(p.due_date));
        let current = null;
        if (currentMonthPayments.length > 0) {
          current = currentMonthPayments.find(p => p.status === 'paid') || currentMonthPayments[0];
        }

        // Override the payment's currency with the student's preferred currency if it's missing or BRL
        // This handles older payments that were created with BRL by default
        if (current) {
          if (!current.currency || current.currency === 'BRL') {
            current.currency = studentCurrency;
          }
        }

        setCurrentPayment(current);
      } catch (err) {
        console.error('Error loading payment:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPayment();
  }, [studentName]);

  if (loading) {
    return <p>Loading payment...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>💳 Current Payment</CardTitle>
        </CardHeader>

        <CardContent className="flex items-center justify-between">
          {currentPayment ? (
            <>
              <div>
                <p className="text-muted-foreground">
                  Due{' '}
                  {format(parseISO(currentPayment.due_date), 'MMM d, yyyy')}
                </p>

                <p className="text-xl font-semibold">
                  {formatCurrency(currentPayment.amount, currentPayment.currency)}
                </p>
              </div>

              {currentPayment.status === 'pending' ? (
                currentPayment.payment_link ? (
                  <Button asChild>
                    <a
                      href={currentPayment.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pay Now
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Awaiting payment link
                  </span>
                )
              ) : (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  Paid
                </span>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No payment for this month</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📄 Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">For payments done by PIX, here is the key:</p>
            <p className="text-lg font-bold mt-1 text-foreground">42288104/0001-93</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              For payments done by credit card, please contact our administration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPayments;
