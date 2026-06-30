import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ReadOnlyCalendar } from '@/components/calendar/ReadOnlyCalendar';

const StudentCalendar: React.FC = () => {
    const { studentName } = useAuth();

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    📅 My Calendar
                </h2>
                <p className="text-muted-foreground mt-1">
                    View your upcoming schedule
                </p>
            </div>

            {studentName ? (
                <ReadOnlyCalendar role="student" identifier={studentName} />
            ) : (
                <div className="p-4 text-center text-muted-foreground">Loading calendar...</div>
            )}
        </div>
    );
};

export default StudentCalendar;
