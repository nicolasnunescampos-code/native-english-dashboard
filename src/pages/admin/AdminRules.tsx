import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Rule } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const AdminRules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  // Fetch rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dashboard_rules', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_rules')
        .select('*')
        .eq('role', activeTab)
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      return data as Rule[];
    },
  });

  // Mutations
  const createRule = useMutation({
    mutationFn: async (newRule: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('dashboard_rules')
        .insert(newRule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_rules', activeTab] });
      toast({ title: 'Success', description: 'Rule created successfully' });
      setIsDialogOpen(false);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async (updatedRule: Rule) => {
      const { data, error } = await supabase
        .from('dashboard_rules')
        .update({
          title: updatedRule.title,
          content: updatedRule.content,
          order_index: updatedRule.order_index,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedRule.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_rules', activeTab] });
      toast({ title: 'Success', description: 'Rule updated successfully' });
      setIsDialogOpen(false);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dashboard_rules').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_rules', activeTab] });
      toast({ title: 'Success', description: 'Rule deleted successfully' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const reorderRulesMutation = useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      // Supabase js client doesn't support bulk updates easily, so we do them sequentially
      const promises = updates.map((update) => 
        supabase.from('dashboard_rules').update({ order_index: update.order_index }).eq('id', update.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_rules', activeTab] });
    },
  });

  // Handlers
  const openDialog = (rule?: Rule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({ title: rule.title, content: rule.content });
    } else {
      setEditingRule(null);
      setFormData({ title: '', content: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    if (editingRule) {
      updateRule.mutate({ ...editingRule, ...formData });
    } else {
      const maxOrder = rules.length > 0 ? Math.max(...rules.map(r => r.order_index)) : -1;
      createRule.mutate({
        role: activeTab,
        title: formData.title,
        content: formData.content,
        order_index: maxOrder + 1,
      });
    }
  };

  const moveRule = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === rules.length - 1)
    ) return;

    const newRules = [...rules];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap order indices
    const tempOrder = newRules[index].order_index;
    newRules[index].order_index = newRules[swapIndex].order_index;
    newRules[swapIndex].order_index = tempOrder;

    reorderRulesMutation.mutate([
      { id: newRules[index].id!, order_index: newRules[index].order_index },
      { id: newRules[swapIndex].id!, order_index: newRules[swapIndex].order_index },
    ]);
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Manage Rules</h2>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      <Tabs defaultValue="student" onValueChange={(v) => setActiveTab(v as 'student' | 'teacher')}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="student">Student Rules</TabsTrigger>
          <TabsTrigger value="teacher">Teacher Rules</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeTab} Dashboard Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading rules...</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {activeTab} rules found. Click "Add Rule" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <div 
                      key={rule.id} 
                      className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:border-border transition-colors group"
                    >
                      <div className="flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          disabled={index === 0}
                          onClick={() => moveRule(index, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          disabled={index === rules.length - 1}
                          onClick={() => moveRule(index, 'down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-lg">{rule.title}</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap">{rule.content}</p>
                      </div>

                      <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" onClick={() => openDialog(rule)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this rule?')) {
                              deleteRule.mutate(rule.id!);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit' : 'Add'} {activeTab === 'student' ? 'Student' : 'Teacher'} Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Class Cancellation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the rule description here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createRule.isPending || updateRule.isPending}>
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRules;
