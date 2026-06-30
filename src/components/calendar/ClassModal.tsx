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
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Teacher, Student } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

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

    const showRecurrenceOptions = !initialData || (initialData && !isSeries);
    const showEditModes = initialData && isSeries;

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    timezone: initialData.timezone || 'America/Sao_Paulo',
                    is_recurring: initialData.is_recurring ?? false,
                    edit_mode: initialData.edit_mode || 'single',
                    repeat_until: initialData.repeat_until || '',
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

        const teacherPart = teacher ? ` - ${teacher.name}` : '';
        const newTitle = `${studentPart}${teacherPart}`;

        // Only update if it's a new class OR the user hasn't manually changed the title
        // We assume if the current title matches the standard format of ANY combination of students/teachers, it's safe to update.
        // For simplicity, let's just always update it if it ends with "class" or "class - TeacherName", meaning it's a standard title.
        const isStandardTitle = formData.title === '' || formData.title.includes('class');
        
        if (!initialData || isStandardTitle) {
            setFormData(prev => ({ ...prev, title: newTitle }));
        }
    }, [formData.teacher_id, formData.student_ids, teachers, students]);

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
                    <DialogTitle>
                        {initialData ? 'Edit Class' : 'Schedule New Class'}
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
                                Class will repeat weekly until this date.
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


                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {initialData && onDelete && (
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                            className="mr-auto"
                            type="button"
                        >
                            Delete
                        </Button>
                    )}
                    {initialData && onDuplicate && (
                        <Button
                            variant="secondary"
                            onClick={() => onDuplicate(formData)}
                            className="mr-2"
                            type="button"
                        >
                            Duplicate
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Class'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
