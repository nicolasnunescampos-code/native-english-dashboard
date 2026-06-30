import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ReadOnlyCalendar } from '@/components/calendar/ReadOnlyCalendar';

const TeacherCalendar: React.FC = () => {
    const { teacherName } = useAuth();

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    📅 Visual Schedule
                </h2>
                <p className="text-muted-foreground mt-1">
                    View your weekly class schedule
                </p>
            </div>

            {teacherName ? (
                <ReadOnlyCalendar role="teacher" identifier={teacherName} />
            ) : (
                <div className="p-4 text-center text-muted-foreground">Loading calendar...</div>
            )}
        </div>
    );
};

export default TeacherCalendar;
