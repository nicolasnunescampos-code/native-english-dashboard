import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, X, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Teacher, Student } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { openGoogleCalendarEvent } from '@/utils/googleCalendar';

export interface ClassFormData {
    id?: number;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    teacher_id: string;
    student_ids: string[];
    status: 'draft' | 'published';
    // Recurrence
    is_recurring?: boolean;
    repeat_until?: string;
    // Edit Mode
    edit_mode?: 'single' | 'following' | 'all';
    event_id?: string; // To track if it belongs to a series
    merged_ids?: number[]; // Track all IDs belonging to this group
    recuperation_id?: string; // Linked recuperation credit
    class_type?: string;
}

export interface ClassFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: ClassFormData) => void;
    initialData?: ClassFormData | null;
    teachers: Teacher[];
    students: Student[];
    loading?: boolean;
    onDelete?: () => void;
    onDuplicate?: (data: ClassFormData) => void; // New prop
    onCourtesyReschedule?: (data: ClassFormData, scheduleNow: boolean) => void; // Courtesy reschedule
    isSeries?: boolean; // New prop
}

export const ClassModal: React.FC<ClassFormProps> = ({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    teachers,
    students,
    loading = false,
    onDelete,
    onDuplicate,
    onCourtesyReschedule,
    isSeries = false,
}) => {
    const [formData, setFormData] = useState<ClassFormData>({
        title: '',
        date: '',
        start_time: '',
        end_time: '',
        timezone: 'America/Sao_Paulo',
        teacher_id: '',
        student_ids: [],
        status: 'published',
        is_recurring: false,
        repeat_until: '',
        edit_mode: 'single',
    });

    const [openStudentSelect, setOpenStudentSelect] = useState(false);
    const [showCourtesyConfirm, setShowCourtesyConfirm] = useState(false);

    const showRecurrenceOptions = !initialData || (initialData && !isSeries);
    const showEditModes = initialData && isSeries;

    useEffect(() => {
        if (open) {
            setShowCourtesyConfirm(false);
            if (initialData) {
                setFormData({
                    ...initialData,
                    timezone: initialData.timezone || 'America/Sao_Paulo',
                    is_recurring: initialData.is_recurring ?? false,
                    edit_mode: initialData.edit_mode || 'single',
                    repeat_until: initialData.repeat_until || '',
                    recuperation_id: initialData.recuperation_id,
                });
            } else {
                // Reset form for new entry
                setFormData({
                    title: '',
                    date: new Date().toISOString().split('T')[0],
                    start_time: '10:00',
                    end_time: '11:00',
                    timezone: 'America/Sao_Paulo',
                    teacher_id: '',
                    student_ids: [],
                    status: 'published',
                    is_recurring: false,
                    repeat_until: '',
                    edit_mode: 'single',
                });
            }
        }
    }, [open, initialData]);

    // Auto-generate title
    useEffect(() => {
        const teacher = teachers.find(t => t.id === formData.teacher_id);
        const studentNames = students
            .filter(s => formData.student_ids.includes(s.id))
            .map(s => s.student_name);

        let studentPart = 'Multiple Students';
        if (studentNames.length === 0) {
            studentPart = 'Class';
        } else if (studentNames.length === 1) {
            studentPart = `${studentNames[0]}'s class`;
        } else {
            const namesCopy = [...studentNames];
            const last = namesCopy.pop();
            studentPart = `${namesCopy.join(', ')} and ${last}'s class`;
        }

        const isRecuperation = !!formData.recuperation_id || (formData.title && formData.title.includes('Extra Class'));
        if (isRecuperation && !studentPart.startsWith('[Extra Class]')) {
            studentPart = `[Extra Class] ${studentPart}`;
        }

        const teacherPart = teacher ? ` - ${teacher.name}` : '';
        const newTitle = `${studentPart}${teacherPart}`;

        // Only update if it's a new class OR the user hasn't manually changed the title
        const isStandardTitle = formData.title === '' || formData.title.includes('class');
        
        if (!initialData || isStandardTitle) {
            setFormData(prev => ({ ...prev, title: newTitle }));
        }
    }, [formData.teacher_id, formData.student_ids, formData.recuperation_id, teachers, students]);

    const handleSubmit = () => {
        onSubmit(formData);
    };

    const toggleStudent = (studentId: string) => {
        setFormData((prev) => {
            const exists = prev.student_ids.includes(studentId);
            if (exists) {
                return {
                    ...prev,
                    student_ids: prev.student_ids.filter((id) => id !== studentId),
                };
            } else {
                return {
                    ...prev,
                    student_ids: [...prev.student_ids, studentId],
                };
            }
        });
    };

    const removeStudent = (studentId: string) => {
        setFormData((prev) => ({
            ...prev,
            student_ids: prev.student_ids.filter((id) => id !== studentId),
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {formData.recuperation_id ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-0.5">
                                🔄 Extra Class Scheduling
                            </Badge>
                        ) : null}
                        <span>{initialData ? 'Edit Class' : 'Schedule New Class'}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* TITLE INPUT */}
                    <div className="grid gap-2">
                        <Label>Class Title</Label>
                        <Input
                            placeholder="e.g. Nicolas's class - Vianei"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* TEACHER SELECT */}
                    <div className="grid gap-2">
                        <Label>Teacher</Label>
                        <Select
                            value={formData.teacher_id}
                            onValueChange={(val) =>
                                setFormData({ ...formData, teacher_id: val })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent>
                                {teachers.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            {t.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* DATE & RECURRENCE CHECKBOX */}
                    <div className="flex gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    setFormData({ ...formData, date: e.target.value })
                                }
                            />
                        </div>

                        {/* RECURRENCE (New/Single Class) - Compact */}
                        {showRecurrenceOptions && (
                            <div className="flex items-center gap-2 pb-3">
                                <input
                                    type="checkbox"
                                    id="recurring"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={formData.is_recurring}
                                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                                />
                                <Label htmlFor="recurring" className="cursor-pointer whitespace-nowrap">Repeat Weekly</Label>
                            </div>
                        )}
                    </div>

                    {/* RECURRENCE EXTENDED OPTIONS */}
                    {showRecurrenceOptions && formData.is_recurring && (
                        <div className="grid gap-2 border-l-2 border-primary/20 pl-4 py-2 bg-muted/10 rounded-r-md">
                            <div className="flex items-center gap-2">
                                <Label className="whitespace-nowrap">Until:</Label>
                                <Input
                                    type="date"
                                    className="w-full"
                                    value={formData.repeat_until}
                                    onChange={(e) => setFormData({ ...formData, repeat_until: e.target.value })}
                                    min={formData.date}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Class will repeat weekly until this date. Note: This creates 1 class per week. For students taking multiple classes per week, you must create a separate recurring class for each day.
                            </p>
                        </div>
                    )}

                    {/* RECURRENCE (Edit Existing Series) */}
                    {showEditModes && (
                        <div className="grid gap-2 border p-3 rounded-md bg-yellow-50/50">
                            <Label>Apply changes to:</Label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="edit_mode"
                                        value="single"
                                        checked={formData.edit_mode === 'single'}
                                        onChange={() => setFormData({ ...formData, edit_mode: 'single' })}
                                        className="h-4 w-4"
                                    />
                                    <span>This event only</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="edit_mode"
                                        value="following"
                                        checked={formData.edit_mode === 'following'}
                                        onChange={() => setFormData({ ...formData, edit_mode: 'following' })}
                                        className="h-4 w-4"
                                    />
                                    <span>This and following events</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="edit_mode"
                                        value="all"
                                        checked={formData.edit_mode === 'all'}
                                        onChange={() => setFormData({ ...formData, edit_mode: 'all' })}
                                        className="h-4 w-4"
                                    />
                                    <span>All events in series</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* TIME (Side by Side) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Start</Label>
                            <Input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) =>
                                    setFormData({ ...formData, start_time: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>End</Label>
                            <Input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) =>
                                    setFormData({ ...formData, end_time: e.target.value })
                                }
                            />
                        </div>
                    </div>

                    {/* TIMEZONE */}
                    <div className="grid gap-2">
                        <Label>Timezone</Label>
                        <Select
                            value={formData.timezone}
                            onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="America/New_York">New York</SelectItem>
                                <SelectItem value="America/Sao_Paulo">São Paulo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* STUDENTS MULTI-SELECT */}
                    <div className="grid gap-2">
                        <Label>Students</Label>
                        <Popover open={openStudentSelect} onOpenChange={setOpenStudentSelect}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openStudentSelect}
                                    className="w-full justify-between"
                                >
                                    {formData.student_ids.length > 0
                                        ? `${formData.student_ids.length} student(s) selected`
                                        : 'Select students...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandInput placeholder="Search student..." />
                                    <CommandList>
                                        <CommandEmpty>No student found.</CommandEmpty>
                                        <CommandGroup>
                                            {students.map((student) => (
                                                <CommandItem
                                                    key={student.id}
                                                    value={student.student_name}
                                                    onSelect={() => toggleStudent(student.id)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            formData.student_ids.includes(student.id)
                                                                ? 'opacity-100'
                                                                : 'opacity-0'
                                                        )}
                                                    />
                                                    {student.student_name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Selected Students Badges */}
                        {formData.student_ids.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.student_ids.map((id) => {
                                    const student = students.find((s) => s.id === id);
                                    if (!student) return null;
                                    return (
                                        <Badge key={id} variant="secondary">
                                            {student.student_name}
                                            <button
                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                onClick={() => removeStudent(id)}
                                            >
                                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* COURTESY RESCHEDULE CONFIRMATION ALERT */}
                    {showCourtesyConfirm && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                        Reschedule as Courtesy
                                    </h4>
                                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                        This will cancel this class and grant a recuperation credit to this student. How would you like to handle the makeup class?
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                                    onClick={() => {
                                        if (onCourtesyReschedule) {
                                            onCourtesyReschedule(formData, true);
                                        }
                                        setShowCourtesyConfirm(false);
                                    }}
                                >
                                    Slot Makeup Class Now
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-300 text-amber-900 dark:text-amber-200 text-xs hover:bg-amber-100 h-8"
                                    onClick={() => {
                                        if (onCourtesyReschedule) {
                                            onCourtesyReschedule(formData, false);
                                        }
                                        setShowCourtesyConfirm(false);
                                        onOpenChange(false);
                                    }}
                                >
                                    Send to Staging Tray (Later)
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 ml-auto text-muted-foreground"
                                    onClick={() => setShowCourtesyConfirm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                </div>

                <DialogFooter className="gap-2 sm:gap-1 flex-wrap">
                    {initialData && onDelete && (
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                            className="mr-auto"
                            type="button"
                            size="sm"
                        >
                            Delete
                        </Button>
                    )}
                    {initialData && onCourtesyReschedule && !showCourtesyConfirm && (
                        <Button
                            variant="outline"
                            onClick={() => setShowCourtesyConfirm(true)}
                            className="mr-1 border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800 text-xs"
                            type="button"
                            size="sm"
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Courtesy Reschedule
                        </Button>
                    )}
                    {formData.date && formData.start_time && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                const teacher = teachers.find(t => t.id === formData.teacher_id);
                                const studentNames = students
                                    .filter(s => formData.student_ids.includes(s.id))
                                    .map(s => s.student_name)
                                    .join(', ');

                                openGoogleCalendarEvent({
                                    title: formData.title || `${studentNames || 'Student'}'s class`,
                                    date: formData.date,
                                    startTime: formData.start_time || '10:00',
                                    endTime: formData.end_time || '10:50',
                                    timezone: formData.timezone || 'America/Sao_Paulo',
                                    description: `Teacher: ${teacher?.name || 'TBD'}\nStudent: ${studentNames || 'Student'}\nMeet Link: ${teacher?.meet_link || ''}${formData.recuperation_id ? '\n[Recuperation Class]' : ''}`,
                                    location: teacher?.meet_link || '',
                                });
                            }}
                            className="mr-1 border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 text-xs"
                            type="button"
                            size="sm"
                        >
                            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                            Add to GCal
                        </Button>
                    )}
                    {initialData && onDuplicate && (
                        <Button
                            variant="secondary"
                            onClick={() => onDuplicate(formData)}
                            className="mr-1 text-xs"
                            type="button"
                            size="sm"
                        >
                            Duplicate
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} size="sm" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Class'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
