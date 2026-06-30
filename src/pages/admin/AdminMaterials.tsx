import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase, Material } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2, Plus, Pencil, ExternalLink, Upload } from 'lucide-react';
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

const CATEGORIES = ['Grammar', 'Entertainment', 'Club', 'Business'];

const getDriveId = (url: string) => {
    if (!url) return null;
    const regExp = /\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? (match[1] || match[2]) : null;
};

const getThumbnailSrc = (url: string, materialUrl: string) => {
    // If a specific thumbnail URL is provided, try to use it
    if (url) {
        const driveId = getDriveId(url);
        if (driveId) {
            return `https://drive.google.com/uc?export=view&id=${driveId}`;
        }
        return url;
    }
    // Fallback: try to generate a thumbnail from the material's main URL if it's a Drive link
    const matDriveId = getDriveId(materialUrl);
    if (matDriveId) {
        return `https://drive.google.com/thumbnail?id=${matDriveId}&sz=w600-h400`; // Google Drive thumbnail API
    }
    return '';
};

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
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [category, setCategory] = useState('Grammar');
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
        setThumbnailUrl('');
        setThumbnailFile(null);
        setCategory('Grammar');
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
        setThumbnailUrl(material.thumbnail_url || '');
        setThumbnailFile(null);
        setCategory(material.category || 'Grammar');
        setLevel(material.level || '');
        setTargetAudience(material.target_audience || 'both');
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let finalThumbnailUrl = thumbnailUrl;

            if (thumbnailFile) {
                const fileExt = thumbnailFile.name.split('.').pop();
                const cleanName = thumbnailFile.name.replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('thumbnails')
                    .upload(filePath, thumbnailFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('thumbnails')
                    .getPublicUrl(filePath);

                finalThumbnailUrl = data.publicUrl;
            }

            const materialData = {
                title,
                description,
                url,
                thumbnail_url: finalThumbnailUrl,
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setThumbnailFile(e.target.files[0]);
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
                                <Label htmlFor="thumbnail-file">Thumbnail Image (Optional)</Label>
                                <div className="space-y-2">
                                    <Input
                                        id="thumbnail-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="cursor-pointer"
                                    />
                                    {thumbnailUrl && !thumbnailFile && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>Current image:</span>
                                            <a
                                                href={thumbnailUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline flex items-center gap-1"
                                            >
                                                View <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                    {thumbnailFile && (
                                        <div className="text-xs text-green-600 font-medium">
                                            New image selected: {thumbnailFile.name}
                                        </div>
                                    )}
                                </div>
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
                                    .filter(material => (material.category || 'Grammar').toLowerCase() === cat.toLowerCase())
                                    .map((material) => (
                                    <Card key={material.id} className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full border-muted-foreground/20">
                                        {/* Netflix style Thumbnail */}
                                        <div className="w-full aspect-video bg-muted relative shrink-0 overflow-hidden">
                                            <img
                                                src={getThumbnailSrc(material.thumbnail_url || '', material.url)}
                                                alt={material.title}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/2a2a2a/ffffff?text=Material';
                                                }}
                                            />
                                            {/* Action overlays on hover */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-1 shadow-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(material)}
                                                    className="h-7 w-7"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="h-3 w-3" />
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
                                        <CardContent className="p-4 flex flex-col flex-1">
                                            <div className="mb-2">
                                                <h3 className="font-semibold text-lg leading-tight line-clamp-1">{material.title}</h3>
                                                <div className="flex gap-2 items-center mt-2 flex-wrap">
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                                                        {material.level}
                                                    </span>
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-secondary/30 text-secondary-foreground capitalize">
                                                        {material.target_audience || 'both'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {material.description && (
                                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2 mb-4 flex-1">
                                                  {material.description}
                                              </p>
                                            )}

                                            <Button asChild variant="default" className="w-full mt-auto shadow-sm">
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
                                {materials.filter(m => (m.category || 'Grammar').toLowerCase() === cat.toLowerCase()).length === 0 && (
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
