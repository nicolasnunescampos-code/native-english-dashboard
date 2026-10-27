import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  MessageSquare,
  BarChart,
  Users,
  Calendar,
  BookOpen,
  Clock,
  Loader2,
  Eye,
  Play,
  Square,
  RotateCcw,
} from "lucide-react";

type FeedbackResponse = {
  id: string;
  request_id: string;
  student_id: string;
  classes_score: number;
  teachers_score: number;
  lessons_score: number;
  schedule_score: number;
  comments: string | null;
  created_at: string;
  student_name?: string;
};

type FeedbackRequest = {
  id: string;
  created_at: string;
  status: string;
  responses?: FeedbackResponse[];
};

export default function AdminFeedback() {
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all requests
      const { data: requestsData, error: reqError } = await supabase
        .from('feedback_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;

      // Fetch all responses
      const { data: responsesData, error: resError } = await supabase
        .from('student_feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (resError) throw resError;

      // Fetch student names to map them
      const { data: studentsData, error: stuError } = await supabase
        .from('students')
        .select('id, student_name');

      if (stuError) throw stuError;

      const studentMap = new Map(studentsData?.map(s => [s.id, s.student_name]));

      // Map responses to requests
      const mappedRequests = (requestsData || []).map(req => {
        const reqResponses = (responsesData || []).filter(r => r.request_id === req.id).map(r => ({
          ...r,
          student_name: studentMap.get(r.student_id) || 'Unknown Student'
        }));
        return {
          ...req,
          responses: reqResponses
        };
      });

      setRequests(mappedRequests);
    } catch (err) {
      console.error("Error fetching feedback data:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeCampaigns = requests.filter(r => r.status === 'active');
  const hasActiveCampaign = activeCampaigns.length > 0;

  const handleStartCampaign = async () => {
    if (!confirm("Start a new feedback campaign? Students will see the 'Rate Your Experience' pop-up on their screen.")) {
      return;
    }

    setActionLoading(true);
    try {
      // Close any existing active campaigns first so there is a single clean active campaign
      if (hasActiveCampaign) {
        await supabase
          .from('feedback_requests')
          .update({ status: 'closed' })
          .eq('status', 'active');
      }

      const { error } = await supabase
        .from('feedback_requests')
        .insert({ status: 'active' });

      if (error) throw error;

      toast({
        title: "Feedback campaign started",
        description: "Students will now be prompted to rate their experience.",
      });
      await fetchData();
    } catch (err) {
      console.error("Error starting feedback campaign:", err);
      toast({
        title: "Error",
        description: "Failed to start feedback campaign.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopAllActiveCampaigns = async () => {
    if (!confirm("Stop the active feedback campaign? Students who haven't answered yet will no longer see the pop-up.")) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .update({ status: 'closed' })
        .eq('status', 'active');

      if (error) throw error;

      toast({
        title: "Feedback campaign stopped",
        description: "The feedback pop-up has been deactivated for all students.",
      });
      await fetchData();
    } catch (err) {
      console.error("Error stopping feedback campaign:", err);
      toast({
        title: "Error",
        description: "Failed to stop feedback campaign.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSingleCampaign = async (request: FeedbackRequest) => {
    const nextStatus = request.status === 'active' ? 'closed' : 'active';
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .update({ status: nextStatus })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: nextStatus === 'active' ? "Campaign reactivated" : "Campaign stopped",
        description:
          nextStatus === 'active'
            ? "Students who haven't answered this campaign will now see the pop-up."
            : "This campaign is now closed.",
      });
      await fetchData();
    } catch (err) {
      console.error("Error updating campaign status:", err);
      toast({
        title: "Error",
        description: "Failed to update campaign status.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <MessageSquare className="w-8 h-8" />
              <h1 className="text-3xl font-bold tracking-tight">Student Feedback</h1>
              {hasActiveCampaign ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Campaign Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 border border-white/20">
                  No Active Campaign
                </span>
              )}
            </div>
            <p className="text-blue-100 opacity-90 max-w-2xl text-sm sm:text-base">
              Start or stop student feedback campaigns and review ratings for classes, teachers, lessons, and schedules.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {hasActiveCampaign && (
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={handleStopAllActiveCampaigns}
                className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white border border-rose-400/40 shadow-lg"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 mr-2 fill-current" />
                )}
                Stop Active Campaign
              </Button>
            )}

            <Button
              disabled={actionLoading}
              onClick={handleStartCampaign}
              className="rounded-xl font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2 fill-current" />
              )}
              {hasActiveCampaign ? "Start New Campaign" : "Start Feedback Campaign"}
            </Button>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No feedback campaigns yet</h3>
            <p className="mb-4">Click "Start Feedback Campaign" above to launch your first student rating campaign.</p>
            <Button onClick={handleStartCampaign} disabled={actionLoading} className="rounded-xl font-semibold">
              <Play className="w-4 h-4 mr-2 fill-current" />
              Start Feedback Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {requests.map((request, index) => {
            const responses = request.responses || [];
            const isActive = request.status === 'active';

            // Calculate averages
            const avgClasses = responses.length > 0 ? (responses.reduce((sum, r) => sum + r.classes_score, 0) / responses.length).toFixed(1) : 0;
            const avgTeachers = responses.length > 0 ? (responses.reduce((sum, r) => sum + r.teachers_score, 0) / responses.length).toFixed(1) : 0;
            const avgLessons = responses.length > 0 ? (responses.reduce((sum, r) => sum + r.lessons_score, 0) / responses.length).toFixed(1) : 0;
            const avgSchedule = responses.length > 0 ? (responses.reduce((sum, r) => sum + r.schedule_score, 0) / responses.length).toFixed(1) : 0;

            return (
              <Card key={request.id} className="overflow-hidden shadow-sm border-muted">
                <div className="bg-muted/30 px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Campaign #{requests.length - index}
                      {isActive ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Stopped</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Triggered on {format(new Date(request.created_at), 'PPP')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Responses</p>
                      <p className="text-xl font-bold">{responses.length}</p>
                    </div>

                    <Button
                      variant={isActive ? "destructive" : "outline"}
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleToggleSingleCampaign(request)}
                      className="rounded-xl font-semibold"
                    >
                      {isActive ? (
                        <>
                          <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
                          Stop Campaign
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Resume Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {responses.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b bg-card">
                      <div className="flex flex-col gap-1 items-center justify-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                        <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classes</span>
                        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{avgClasses}</span>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                        <Users className="w-5 h-5 text-emerald-500 mb-1" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teachers</span>
                        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{avgTeachers}</span>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
                        <BookOpen className="w-5 h-5 text-purple-500 mb-1" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lessons</span>
                        <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{avgLessons}</span>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
                        <Clock className="w-5 h-5 text-orange-500 mb-1" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</span>
                        <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">{avgSchedule}</span>
                      </div>
                    </div>

                    <div className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/10">
                          <TableRow>
                            <TableHead className="w-[200px]">Student</TableHead>
                            <TableHead className="text-center">Classes</TableHead>
                            <TableHead className="text-center">Teachers</TableHead>
                            <TableHead className="text-center">Lessons</TableHead>
                            <TableHead className="text-center">Schedule</TableHead>
                            <TableHead>Comments</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {responses.map(response => (
                            <TableRow key={response.id}>
                              <TableCell className="font-medium whitespace-nowrap">{response.student_name}</TableCell>
                              <TableCell className="text-center font-semibold text-blue-600">{response.classes_score}</TableCell>
                              <TableCell className="text-center font-semibold text-emerald-600">{response.teachers_score}</TableCell>
                              <TableCell className="text-center font-semibold text-purple-600">{response.lessons_score}</TableCell>
                              <TableCell className="text-center font-semibold text-orange-600">{response.schedule_score}</TableCell>
                              <TableCell className="max-w-[360px]">
                                {response.comments ? (
                                  <div
                                    onClick={() => setSelectedFeedback(response)}
                                    className="cursor-pointer group flex items-start justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-muted/70 transition-colors"
                                    title="Click to view full comment"
                                  >
                                    <p className="text-sm text-foreground/90 line-clamp-2 leading-snug">
                                      {response.comments}
                                    </p>
                                    <span className="text-[11px] font-semibold text-primary shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity bg-primary/10 px-2 py-0.5 rounded-md mt-0.5">
                                      <Eye className="w-3 h-3" />
                                      View
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/30 text-sm italic">None</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                                {format(new Date(response.created_at), 'MMM d, yyyy')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <BarChart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No responses yet for this campaign.</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Feedback Detail Dialog Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Feedback from {selectedFeedback?.student_name}
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedFeedback?.created_at ? format(new Date(selectedFeedback.created_at), 'MMMM d, yyyy') : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Scores Overview */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Classes</p>
                <p className="text-lg font-bold text-blue-600">{selectedFeedback?.classes_score}/5</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Teachers</p>
                <p className="text-lg font-bold text-emerald-600">{selectedFeedback?.teachers_score}/5</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Lessons</p>
                <p className="text-lg font-bold text-purple-600">{selectedFeedback?.lessons_score}/5</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Schedule</p>
                <p className="text-lg font-bold text-orange-600">{selectedFeedback?.schedule_score}/5</p>
              </div>
            </div>

            {/* Full Comment */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Student Comment</p>
              <div className="p-4 rounded-xl bg-muted/40 border text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                "{selectedFeedback?.comments}"
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
