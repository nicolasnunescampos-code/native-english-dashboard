import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase, Class } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// WEEKLY REPORT MODAL
// ─────────────────────────────────────────────────────────────
const WeeklyReportModal: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void }> = ({ open, onOpenChange }) => {
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])

  const targetDate = addWeeks(new Date(), weekOffset)
  // weekStartsOn: 1 (Monday)
  const startDate = startOfWeek(targetDate, { weekStartsOn: 1 })
  const endDate = endOfWeek(targetDate, { weekStartsOn: 1 })

  useEffect(() => {
    if (!open) return
    loadReport()
  }, [open, weekOffset])

  const loadReport = async () => {
    setLoading(true)
    const formattedStart = format(startDate, 'yyyy-MM-dd')
    const formattedEnd = format(endDate, 'yyyy-MM-dd')

    // Fetch classes for this week
    const { data, error } = await supabase
      .from('classes')
      .select('id, title, is_absent, class_grade, student_name')
      .gte('date', formattedStart)
      .lte('date', formattedEnd)

    if (!error && data) {
      // Group by teacher
      const map: Record<string, { taught: number, absences: number, absentStudents: string[] }> = {}
      for (const cls of data) {
        // Must either be graded or absent
        if (cls.class_grade === null && !cls.is_absent) continue

        const teacher = cls.title || 'Unknown'
        // Skip owners who don't need reports (optional parity with other dashboard feature)
        if (teacher.toLowerCase().includes('nicolas') || teacher.toLowerCase().includes('mariana')) continue

        if (!map[teacher]) map[teacher] = { taught: 0, absences: 0, absentStudents: [] }

        if (cls.is_absent) {
          map[teacher].absences += 1
          if (cls.student_name) map[teacher].absentStudents.push(cls.student_name)
        } else if (cls.class_grade !== null) {
          map[teacher].taught += 1
        }
      }

      const arr = Object.keys(map).map(teacher => ({
        teacher,
        ...map[teacher],
      })).sort((a, b) => a.teacher.localeCompare(b.teacher))

      setReportData(arr)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Weekly Report</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4 mt-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium text-center">
            {format(startDate, 'MMM d, yyyy')} — {format(endDate, 'MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>
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
  )
}

const AdminGrades: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const fetchGradedClasses = async () => {
      try {
        // Fetch teachers for the filter
        const { data: teachersData } = await supabase
          .from('teachers')
          .select('name')
          .order('name');
        
        if (teachersData) {
          setTeachers(teachersData.map(t => t.name));
        }

        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .or('class_grade.not.is.null,is_absent.eq.true')
          .order('date', { ascending: false })
          // Retrieve more so filtering by teacher actually works well
          .limit(100);

        if (error) throw error;
        setClasses(data || []);
      } catch (error) {
        console.error('Error fetching graded classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGradedClasses();
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const filteredClasses = classes.filter(cls => {
    if (selectedTeacher === 'all') return true;
    
    const title = (cls.title || '').toLowerCase();
    const tName = selectedTeacher.toLowerCase();
    
    // Exact match (legacy classes or group classes)
    if (title === tName) return true;
    
    // New format: "Student Name's class - Teacher Name"
    if (title.includes(`- ${tName}`)) return true;
    
    return false;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📊 Recent Grades & Absences
            </h2>
            <p className="text-muted-foreground">Quality Control Tracking</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setReportOpen(true)}>
            <FileText className="h-4 w-4" />
            Weekly Report
          </Button>
        </div>

        <div className="w-full md:w-64 space-y-1">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Filter by Teacher
          </label>
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map(teacherName => (
                <SelectItem key={teacherName} value={teacherName}>
                  {teacherName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Speaking</TableHead>
                <TableHead>Grammar</TableHead>
                <TableHead>Reading</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {selectedTeacher === 'all' ? 'No recent grades or absences' : `No recent activity found for ${selectedTeacher}`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((cls, index) => (
                  <TableRow key={index} className={cls.is_absent ? "bg-red-50/50" : ""}>
                    <TableCell>
                      {format(parseISO(cls.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">{cls.student_name}</TableCell>
                    <TableCell>{cls.title}</TableCell>
                    <TableCell>
                      {cls.class_chapter && !cls.is_absent ? (
                        <Badge variant="outline">{cls.class_chapter}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    {cls.is_absent ? (
                      <TableCell colSpan={4}>
                        <div className="flex items-center text-red-600 font-medium bg-red-100/50 px-3 py-1.5 rounded-md w-fit border border-red-200">
                          <span className="mr-2">✗</span> Student was Absent
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="font-bold text-primary">
                          {cls.class_grade}/10
                        </TableCell>
                        <TableCell>{cls.speaking_grade ?? '-'}</TableCell>
                        <TableCell>{cls.grammar_grade ?? '-'}</TableCell>
                        <TableCell>{cls.reading_grade ?? '-'}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WeeklyReportModal open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
};

export default AdminGrades;
