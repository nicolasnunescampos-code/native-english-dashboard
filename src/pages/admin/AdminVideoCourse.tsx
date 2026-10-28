import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    supabase,
    Video,
    isVideoCourseItem,
    cleanVideoDescription,
    encodeVideoCourseDescription,
    sortVideosByNumber,
} from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2, Plus, Pencil, ExternalLink, Radio, Film } from 'lucide-react';
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
type ModuleType = 'live_classes' | 'course_modules';

const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

const getDriveId = (url: string) => {
    if (!url) return null;
    const regExp = /\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? (match[1] || match[2]) : null;
};

const getThumbnailSrc = (url: string, videoUrl?: string) => {
    if (url) {
        const driveId = getDriveId(url);
        if (driveId) {
            return `https://drive.google.com/uc?export=view&id=${driveId}`;
        }
        return url;
    }
    if (videoUrl) {
        const ytId = getYoutubeId(videoUrl);
        if (ytId) {
            return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
        const driveId = getDriveId(videoUrl);
        if (driveId) {
            return `https://drive.google.com/thumbnail?id=${driveId}&sz=w600-h400`;
        }
    }
    return 'https://placehold.co/600x400?text=No+Thumbnail';
};

const AdminVideoCourse: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [activeModuleTab, setActiveModuleTab] = useState<ModuleType>('live_classes');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [level, setLevel] = useState<string>('');
    const [moduleType, setModuleType] = useState<ModuleType>('live_classes');
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
            console.error('Error fetching course videos:', error);
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
        setModuleType(activeModuleTab);
        setEditingVideo(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (open && !editingVideo) {
            setModuleType(activeModuleTab);
        }
        if (!open) resetForm();
    };

    const handleEdit = (video: Video) => {
        setEditingVideo(video);
        setTitle(video.title);
        setDescription(cleanVideoDescription(video.description));
        setYoutubeUrl(video.youtube_url);
        setThumbnailUrl(video.thumbnail_url);
        setThumbnailFile(null);
        setLevel(video.level);
        setModuleType(isVideoCourseItem(video) ? 'course_modules' : 'live_classes');
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

            const cleanedDesc = cleanVideoDescription(description);
            const finalDescription =
                moduleType === 'course_modules'
                    ? encodeVideoCourseDescription(cleanedDesc)
                    : cleanedDesc;

            const videoData = {
                title,
                description: finalDescription,
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

    const liveClassesVideos = [...videos.filter((v) => !isVideoCourseItem(v))].sort(sortVideosByNumber);
    const courseModulesVideos = [...videos.filter((v) => isVideoCourseItem(v))].sort(sortVideosByNumber);
    const currentModuleVideos =
        activeModuleTab === 'live_classes' ? liveClassesVideos : courseModulesVideos;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        🎬 Manage Video Course
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage lessons inside the Live Classes module and recorded Course Modules.
                    </p>
                </div>

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
                                <Label htmlFor="module">Course Module</Label>
                                <Select
                                    value={moduleType}
                                    onValueChange={(val) => setModuleType(val as ModuleType)}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="live_classes">
                                            Live Classes Module
                                        </SelectItem>
                                        <SelectItem value="course_modules">
                                            Recorded Course Modules
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g., Chapter 1 - Intro to Grammar"
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

            {/* MODULE SELECTOR PILLS */}
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant={activeModuleTab === 'live_classes' ? 'default' : 'outline'}
                    onClick={() => setActiveModuleTab('live_classes')}
                    className="gap-2"
                >
                    <Radio className="h-4 w-4" />
                    <span>Live Classes Module ({liveClassesVideos.length})</span>
                </Button>
                <Button
                    type="button"
                    variant={activeModuleTab === 'course_modules' ? 'default' : 'outline'}
                    onClick={() => setActiveModuleTab('course_modules')}
                    className="gap-2"
                >
                    <Film className="h-4 w-4" />
                    <span>Course Modules ({courseModulesVideos.length})</span>
                </Button>
            </div>

            {currentModuleVideos.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No videos in this module yet. Click "Add Video" to add one.
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="Beginner" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        {LEVELS.map(lvl => (
                            <TabsTrigger key={lvl} value={lvl}>
                                {lvl} ({currentModuleVideos.filter(v => v.level === lvl).length})
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {LEVELS.map(lvl => (
                        <TabsContent key={lvl} value={lvl}>
                            <div className="grid gap-4">
                                {currentModuleVideos
                                    .filter(video => video.level === lvl)
                                    .map((video) => (
                                    <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="w-full sm:w-48 h-32 bg-muted relative shrink-0">
                                                <img
                                                    src={getThumbnailSrc(video.thumbnail_url, video.youtube_url)}
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
                                                            <div className="flex items-center gap-2 mb-2 mt-1">
                                                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-sky-500/15 text-sky-600 dark:text-sky-300">
                                                                    {isVideoCourseItem(video) ? 'Course Module' : 'Live Classes'}
                                                                </span>
                                                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                                    {video.level}
                                                                </span>
                                                            </div>
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
                                                        {cleanVideoDescription(video.description)}
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
                                {currentModuleVideos.filter(v => v.level === lvl).length === 0 && (
                                    <p className="text-muted-foreground text-center py-6">No {lvl.toLowerCase()} videos found in this module.</p>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
};

export default AdminVideoCourse;
