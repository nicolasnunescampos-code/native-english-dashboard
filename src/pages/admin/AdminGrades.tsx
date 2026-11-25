import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DailyClassSummary } from '@/components/admin/DailyClassSummary';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// WEEKLY REPORT MODAL
// ─────────────────────────────────────────────────────────────
const WeeklyReportModal: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void }> = ({ open, onOpenChange }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const targetDate = addWeeks(new Date(), weekOffset);
  // weekStartsOn: 1 (Monday)
  const startDate = startOfWeek(targetDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(targetDate, { weekStartsOn: 1 });

  useEffect(() => {
    if (!open) return;
    loadReport();
  }, [open, weekOffset]);

  const loadReport = async () => {
    setLoading(true);
    const formattedStart = format(startDate, 'yyyy-MM-dd');
    const formattedEnd = format(endDate, 'yyyy-MM-dd');

    // Fetch classes for this week
    const { data, error } = await supabase
      .from('classes')
      .select('id, title, is_absent, class_grade, student_name')
      .gte('date', formattedStart)
      .lte('date', formattedEnd);

    if (!error && data) {
      // Group by teacher
      const map: Record<string, { taught: number; absences: number; absentStudents: string[] }> = {};
      for (const cls of data) {
        // Must either be graded or absent
        if (cls.class_grade === null && !cls.is_absent) continue;

        const teacher = cls.title || 'Unknown';
        // Skip owners who don't need reports (optional parity with other dashboard feature)
        if (teacher.toLowerCase().includes('nicolas') || teacher.toLowerCase().includes('mariana')) continue;

        if (!map[teacher]) map[teacher] = { taught: 0, absences: 0, absentStudents: [] };

        if (cls.is_absent) {
          map[teacher].absences += 1;
          if (cls.student_name) map[teacher].absentStudents.push(cls.student_name);
        } else if (cls.class_grade !== null) {
          map[teacher].taught += 1;
        }
      }

      const arr = Object.keys(map)
        .map((teacher) => ({
          teacher,
          ...map[teacher],
        }))
        .sort((a, b) => a.teacher.localeCompare(b.teacher));

      setReportData(arr);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Weekly Report</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4 mt-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium text-center">
            {format(startDate, 'MMM d, yyyy')} — {format(endDate, 'MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading report...</p>
        ) : reportData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No graded or absent classes found for this week.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-center">Classes Taught</TableHead>
                  <TableHead className="text-center">Absences</TableHead>
                  <TableHead>Absent Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.teacher}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{row.taught}</TableCell>
                    <TableCell className="text-center text-red-600 font-semibold">{row.absences}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.absentStudents.length > 0 ? row.absentStudents.join(', ') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AdminGrades: React.FC = () => {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DailyClassSummary
        headerAction={
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setReportOpen(true)}>
            <FileText className="h-4 w-4" />
            Weekly Report
          </Button>
        }
      />

      <WeeklyReportModal open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
};

export default AdminGrades;
