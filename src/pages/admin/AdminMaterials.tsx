import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase, Material } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2, Plus, Pencil, ExternalLink } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CATEGORIES = ['Business', 'Grammar', 'Entertainment', 'Club'];

const AdminMaterials: React.FC = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState('Business');
    const [level, setLevel] = useState('');
    const [targetAudience, setTargetAudience] = useState('both');

    const fetchMaterials = async () => {
        try {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            setMaterials(data || []);
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, []);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setUrl('');
        setCategory('Business');
        setLevel('');
        setTargetAudience('both');
        setEditingMaterial(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleEdit = (material: Material) => {
        setEditingMaterial(material);
        setTitle(material.title);
        setDescription(material.description || '');
        setUrl(material.url);
        setCategory(material.category || 'Business');
        setLevel(material.level || '');
        setTargetAudience(material.target_audience || 'both');
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const materialData = {
                title,
                description,
                url,
                category,
                level,
                target_audience: targetAudience,
            };

            if (editingMaterial?.id) {
                const { error } = await supabase
                    .from('materials')
                    .update(materialData)
                    .eq('id', editingMaterial.id);
                if (error) throw error;
                toast.success('Material updated successfully');
            } else {
                const { error } = await supabase.from('materials').insert(materialData);
                if (error) throw error;
                toast.success('Material added successfully');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchMaterials();
        } catch (error) {
            console.error('Error saving material:', error);
            toast.error('Failed to save material');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (material: Material) => {
        try {
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', material.id);

            if (error) throw error;

            toast.success('Material deleted');
            fetchMaterials();
        } catch (error) {
            console.error('Error deleting material:', error);
            toast.error('Failed to delete material');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    📚 Manage Materials
                </h2>

                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add New Material'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g., Business English Book 1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Category</Label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <Button
                                            type="button"
                                            key={cat}
                                            variant={category === cat ? "default" : "outline"}
                                            onClick={() => setCategory(cat)}
                                            size="sm"
                                        >
                                            {cat === 'Club' ? 'Conversation Club' : cat}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Target Audience</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['both', 'student', 'teacher'].map(tgt => (
                                        <Button
                                            type="button"
                                            key={tgt}
                                            variant={targetAudience === tgt ? "default" : "outline"}
                                            onClick={() => setTargetAudience(tgt)}
                                            size="sm"
                                            className="capitalize"
                                        >
                                            {tgt}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="level">Level</Label>
                                <Input
                                    id="level"
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value)}
                                    required
                                    placeholder="e.g. Beginner, Intermediate..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="url">Material URL (Drive Link)</Label>
                                <Input
                                    id="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    required
                                    placeholder="e.g. https://drive.google.com/..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Short description of the material..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : editingMaterial ? 'Update' : 'Add Material'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {materials.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No materials found. Add one to get started.
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue={CATEGORIES[0]} className="w-full">
                    <TabsList className="mb-6 flex flex-wrap h-auto gap-2 p-1">
                        {CATEGORIES.map(cat => (
                            <TabsTrigger key={cat} value={cat}>
                                {cat === 'Club' ? 'Conversation Club' : cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {CATEGORIES.map(cat => (
                        <TabsContent key={cat} value={cat}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {materials
                                    .filter(material => (material.category || 'Business').toLowerCase() === cat.toLowerCase())
                                    .map((material) => (
                                    <Card key={material.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col h-full space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{material.title}</h3>
                                                    <div className="flex gap-2 items-center mt-1">
                                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                            {material.level}
                                                        </span>
                                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary-foreground capitalize">
                                                            {material.target_audience || 'both'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(material)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete "{material.title}"? This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground"
                                                                    onClick={() => handleDelete(material)}
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                            
                                            {material.description && (
                                              <p className="text-sm text-muted-foreground flex-1">
                                                  {material.description}
                                              </p>
                                            )}

                                            <Button asChild variant="secondary" className="w-full mt-auto">
                                              <a
                                                href={material.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                Open Material
                                                <ExternalLink className="ml-2 h-4 w-4" />
                                              </a>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                                {materials.filter(m => (m.category || 'Business').toLowerCase() === cat.toLowerCase()).length === 0 && (
                                    <div className="col-span-full">
                                        <p className="text-muted-foreground text-center py-6">No materials found in this category.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
};

export default AdminMaterials;
