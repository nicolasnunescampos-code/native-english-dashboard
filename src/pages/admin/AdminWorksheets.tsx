import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface WorksheetQuestion {
  question_text: string;
  type: string;
  options?: string[];
  correct_answer: string;
}

export default function AdminWorksheets() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<WorksheetQuestion[] | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleGenerate = async () => {
    if (!topic) {
      toast.error("Please enter a topic.");
      return;
    }

    setIsGenerating(true);
    setGeneratedQuestions(null);
    setShowAnswers(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topic, difficulty }
      });

      if (error) throw error;
      
      if (data && data.questions) {
        setGeneratedQuestions(data.questions);
        toast.success("Worksheet generated successfully!");
      } else {
        throw new Error("Invalid response from AI");
      }
      
    } catch (err: any) {
      toast.error('Failed to generate worksheet: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Controls Section (Hidden when printing) */}
      <div className="print:hidden space-y-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            AI Worksheet Generator
          </h2>
          <p className="text-muted-foreground mt-2">
            Instantly generate printable extra practice worksheets for students who missed class.
          </p>
        </div>

        <Card className="border-indigo-100 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6 space-y-2">
                <Label htmlFor="topic">Grammar / Vocabulary Topic</Label>
                <Input 
                  id="topic"
                  placeholder="e.g. Present Perfect vs Simple Past, Phrasal Verbs..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                  className="bg-white"
                />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="difficulty">Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty} disabled={isGenerating}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!topic || isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Now</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Worksheet Section */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-600 space-y-4 print:hidden">
          <Loader2 className="w-12 h-12 animate-spin opacity-50" />
          <p className="text-lg font-medium animate-pulse">Our AI teacher is writing the worksheet...</p>
        </div>
      )}

      {generatedQuestions && !isGenerating && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex justify-between items-center print:hidden">
            <div className="flex gap-4 items-center">
              <Button variant="outline" onClick={() => setShowAnswers(!showAnswers)}>
                {showAnswers ? "Hide Answer Key" : "Show Answer Key"}
              </Button>
            </div>
            <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white shadow-md">
              <Printer className="w-4 h-4 mr-2" /> Print to PDF
            </Button>
          </div>

          {/* This is the printable area */}
          <Card className="print:shadow-none print:border-0 bg-white text-black overflow-hidden print-area">
            <div className="p-10 md:p-14 min-h-[1056px] bg-white"> {/* Rough A4 height */}
              
              {/* Worksheet Header */}
              <div className="flex justify-between items-end border-b-2 border-slate-300 pb-6 mb-10">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 uppercase tracking-wider">Native English</h1>
                  <p className="text-slate-500 font-medium mt-1">Extra Practice Worksheet</p>
                </div>
                <div className="space-y-3 w-64">
                  <div className="border-b border-slate-400 pb-1 flex justify-between text-sm">
                    <span className="font-semibold">Name:</span>
                  </div>
                  <div className="border-b border-slate-400 pb-1 flex justify-between text-sm">
                    <span className="font-semibold">Date:</span>
                  </div>
                </div>
              </div>

              {/* Topic info */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">{topic}</h2>
                <p className="text-slate-500 font-medium mt-1 uppercase text-sm tracking-widest">{difficulty} Level</p>
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {generatedQuestions.map((q, i) => (
                  <div key={i} className="text-slate-800 break-inside-avoid">
                    <div className="flex gap-4">
                      <span className="font-bold text-lg min-w-[24px]">{i + 1}.</span>
                      <div className="flex-1 space-y-3">
                        <p className="text-lg leading-relaxed font-medium">
                          {q.question_text.replace(/___/g, '______________')}
                        </p>
                        
                        {q.type === 'multiple-choice' && q.options && (
                          <div className="grid grid-cols-2 gap-y-2 gap-x-8 pl-4">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-slate-400 shrink-0" />
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {showAnswers && (
                          <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded text-sm font-bold print:hidden">
                            Answer: {q.correct_answer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm font-medium">
                Keep practicing! Every mistake is a step towards fluency.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Print styles injected directly to ensure they work */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Hide the scrollbars and extra padding */
          main, .p-4, .p-8 {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />
    </div>
  );
}
