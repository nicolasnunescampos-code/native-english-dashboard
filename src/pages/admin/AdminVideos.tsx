import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase, Video } from '@/lib/supabase';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const getDriveId = (url: string) => {
    const regExp = /\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? (match[1] || match[2]) : null;
};

const getThumbnailSrc = (url: string) => {
    const driveId = getDriveId(url);
    if (driveId) {
        return `https://drive.google.com/uc?export=view&id=${driveId}`;
    }
    return url;
};

const AdminVideos: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [level, setLevel] = useState<string>('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    const fetchVideos = async () => {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            setVideos(data || []);
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setYoutubeUrl('');
        setThumbnailUrl('');
        setThumbnailFile(null);
        setLevel('');
        setEditingVideo(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleEdit = (video: Video) => {
        setEditingVideo(video);
        setTitle(video.title);
        setDescription(video.description || '');
        setYoutubeUrl(video.youtube_url);
        setThumbnailUrl(video.thumbnail_url);
        setThumbnailFile(null);
        setLevel(video.level);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let finalThumbnailUrl = thumbnailUrl;

            if (thumbnailFile) {
                const fileExt = thumbnailFile.name.split('.').pop();
                // Sanitize filename: remove special chars, keep only alphanumeric, dashes, underscores
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

            const videoData = {
                title,
                description,
                youtube_url: youtubeUrl,
                thumbnail_url: finalThumbnailUrl,
                level,
            };

            if (editingVideo?.id) {
                const { error } = await supabase
                    .from('videos')
                    .update(videoData)
                    .eq('id', editingVideo.id);
                if (error) throw error;
                toast.success('Video updated successfully');
            } else {
                const { error } = await supabase.from('videos').insert(videoData);
                if (error) throw error;
                toast.success('Video added successfully');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchVideos();
        } catch (error) {
            console.error('Error saving video:', error);
            toast.error('Failed to save video');
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setThumbnailFile(e.target.files[0]);
        }
    };

    const handleDelete = async (video: Video) => {
        try {
            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id);

            if (error) throw error;

            toast.success('Video deleted');
            fetchVideos();
        } catch (error) {
            console.error('Error deleting video:', error);
            toast.error('Failed to delete video');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    🎥 Manage Videos
                </h2>

                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Video
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g., Intro to Grammar"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="level">Level</Label>
                                <Select value={level} onValueChange={setLevel} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LEVELS.map((l) => (
                                            <SelectItem key={l} value={l}>
                                                {l}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="youtube">Video URL (YouTube or Google Drive)</Label>
                                <Input
                                    id="youtube"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    required
                                    placeholder="e.g. YouTube link or Google Drive Share link"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="thumbnail-file">Thumbnail Image</Label>
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
                                    placeholder="Short description of the video..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : editingVideo ? 'Update' : 'Add Video'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {videos.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No videos found. Add one to get started.
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="Beginner" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        {LEVELS.map(level => (
                            <TabsTrigger key={level} value={level}>
                                {level}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {LEVELS.map(level => (
                        <TabsContent key={level} value={level}>
                            <div className="grid gap-4">
                                {videos
                                    .filter(video => video.level === level)
                                    .map((video) => (
                                    <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="w-full sm:w-48 h-32 bg-muted relative shrink-0">
                                                <img
                                                    src={getThumbnailSrc(video.thumbnail_url)}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            'https://placehold.co/600x400?text=No+Thumbnail';
                                                    }}
                                                />
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{video.title}</h3>
                                                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mb-2">
                                                                {video.level}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(video)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Video?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to delete "{video.title}"? This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            className="bg-destructive text-destructive-foreground"
                                                                            onClick={() => handleDelete(video)}
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {video.description}
                                                    </p>
                                                </div>
                                                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                                    <ExternalLink className="h-3 w-3" />
                                                    <a
                                                        href={video.youtube_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:underline"
                                                    >
                                                        {video.youtube_url}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {videos.filter(v => v.level === level).length === 0 && (
                                    <p className="text-muted-foreground text-center py-6">No {level.toLowerCase()} videos found.</p>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
};

export default AdminVideos;
