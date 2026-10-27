import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    AUDIO_CATEGORIES,
    ExtendedAudio,
    UnlinkedStorageAudio,
    fetchAllAudios,
    uploadAndSaveAudio,
    deleteAudioRecord,
    listUnlinkedStorageAudios,
    recoverStorageAudio,
} from '@/lib/audioCatalog';
import { toast } from 'sonner';
import { Trash2, Plus, Play, FolderSync, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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

const AdminAudios: React.FC = () => {
    const [audios, setAudios] = useState<ExtendedAudio[]>([]);
    const [unlinkedFiles, setUnlinkedFiles] = useState<UnlinkedStorageAudio[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRecoverDialogOpen, setIsRecoverDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [recoveringFile, setRecoveringFile] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('Beginner');
    const [audioFile, setAudioFile] = useState<File | null>(null);

    const fetchAudios = async () => {
        try {
            const loadedAudios = await fetchAllAudios();
            setAudios(loadedAudios);
            const unlinked = await listUnlinkedStorageAudios(loadedAudios);
            setUnlinkedFiles(unlinked);
        } catch (error) {
            console.error('Error fetching audios:', error);
            toast.error('Failed to load audios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAudios();
    }, []);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setCategory('Beginner');
        setAudioFile(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!audioFile) {
            toast.error('Please select an audio file.');
            return;
        }

        setSaving(true);

        try {
            await uploadAndSaveAudio({
                title,
                description,
                category,
                audioFile,
            });

            toast.success('Audio added successfully');
            setIsDialogOpen(false);
            resetForm();
            await fetchAudios();
        } catch (error: any) {
            console.error('Error saving audio:', error);
            toast.error(error?.message ? `Failed to upload audio: ${error.message}` : 'Failed to upload audio');
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setAudioFile(selected);
            if (!title.trim()) {
                const autoTitle = selected.name
                    .replace(/\.[^.]+$/, '')
                    .replace(/[_-]+/g, ' ')
                    .trim();
                setTitle(autoTitle);
            }
        }
    };

    const handleDelete = async (audio: ExtendedAudio) => {
        try {
            await deleteAudioRecord(audio);
            toast.success('Audio deleted');
            await fetchAudios();
        } catch (error) {
            console.error('Error deleting audio:', error);
            toast.error('Failed to delete audio');
        }
    };

    const handleRecoverSingle = async (item: UnlinkedStorageAudio) => {
        setRecoveringFile(item.name);
        try {
            await recoverStorageAudio({
                title: item.suggestedTitle,
                description: '',
                category: item.suggestedCategory,
                url: item.url,
            });
            toast.success(`Recovered "${item.suggestedTitle}"`);
            await fetchAudios();
        } catch (error: any) {
            console.error('Error recovering audio:', error);
            toast.error(error?.message || 'Failed to recover audio file');
        } finally {
            setRecoveringFile(null);
        }
    };

    const filteredAudios =
        activeCategory === 'All'
            ? audios
            : audios.filter((a) => (a.category || 'Beginner') === activeCategory);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    🎙️ Manage Audios
                </h2>

                <div className="flex items-center gap-2">
                    {unlinkedFiles.length > 0 && (
                        <Dialog open={isRecoverDialogOpen} onOpenChange={setIsRecoverDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <FolderSync className="h-4 w-4 mr-2 text-sky-600" />
                                    Recover Previous Uploads ({unlinkedFiles.length})
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Recover Previously Uploaded Audio Files</DialogTitle>
                                </DialogHeader>
                                <p className="text-xs text-muted-foreground">
                                    These audio files were already uploaded to your storage bucket. Click <strong>Restore</strong> on any track to add it to the audio library.
                                </p>
                                <div className="space-y-2.5 mt-2">
                                    {unlinkedFiles.map((item) => (
                                        <div
                                            key={item.name}
                                            className="p-3 rounded-2xl border bg-white/50 dark:bg-slate-900/50 flex flex-col gap-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm truncate">
                                                        {item.suggestedTitle}
                                                    </p>
                                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-sky-500/15 text-sky-700 dark:text-sky-300 mt-0.5">
                                                        {item.suggestedCategory}
                                                    </span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={recoveringFile === item.name}
                                                    onClick={() => handleRecoverSingle(item)}
                                                >
                                                    <Check className="h-3.5 w-3.5 mr-1.5" />
                                                    {recoveringFile === item.name ? 'Restoring...' : 'Restore'}
                                                </Button>
                                            </div>
                                            <audio controls src={item.url} className="w-full h-8" />
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Audio
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Upload New Audio</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="e.g., Chapter 1 Listening Practice"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category (Book Level)</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AUDIO_CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="audio-file">Audio File (MP3, WAV)</Label>
                                    <div className="space-y-2">
                                        <Input
                                            id="audio-file"
                                            type="file"
                                            accept="audio/*,.mp3,.wav,.m4a,.ogg"
                                            onChange={handleFileChange}
                                            required
                                            className="cursor-pointer"
                                        />
                                        {audioFile && (
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                Ready to upload: {audioFile.name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Short description..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? 'Uploading...' : 'Upload & Save'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {audios.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {['All', ...AUDIO_CATEGORIES].map((cat) => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            )}

            {loading ? (
                <p className="text-muted-foreground">Loading audios...</p>
            ) : filteredAudios.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground space-y-3">
                        <p>
                            {audios.length === 0
                                ? 'No audio materials found. Upload one to get started.'
                                : `No audio materials found in ${activeCategory}.`}
                        </p>
                        {audios.length === 0 && unlinkedFiles.length > 0 && (
                            <div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsRecoverDialogOpen(true)}
                                >
                                    <FolderSync className="h-4 w-4 mr-2 text-sky-600" />
                                    Restore from {unlinkedFiles.length} previously uploaded storage files
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredAudios.map((audio) => (
                        <Card key={audio.id || audio.url} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="h-12 w-12 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
                                    <Play className="h-6 w-6 ml-1" />
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-lg">{audio.title}</h3>
                                        {audio.category && (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-sky-300/50 bg-sky-500/15 text-sky-800 dark:text-sky-200">
                                                {audio.category}
                                            </span>
                                        )}
                                    </div>
                                    {audio.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                            {audio.description}
                                        </p>
                                    )}
                                    <div className="mt-2">
                                        <audio controls src={audio.url} className="w-full h-8" />
                                    </div>
                                </div>
                                <div className="flex gap-2 self-start sm:self-center">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Audio?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete "{audio.title}"?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground"
                                                    onClick={() => handleDelete(audio)}
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminAudios;
