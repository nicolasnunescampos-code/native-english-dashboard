import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase, Audio } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2, Plus, Play, Upload } from 'lucide-react';
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
    const [audios, setAudios] = useState<Audio[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('Beginner');
    const [audioFile, setAudioFile] = useState<File | null>(null);

    const CAREGORIES = ['Beginner', 'Intermediate', 'Advanced 1', 'Advanced 2'];

    const fetchAudios = async () => {
        try {
            const { data, error } = await supabase
                .from('audios')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            setAudios(data || []);
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
            toast.error("Please select an audio file.");
            return;
        }

        setSaving(true);

        try {
            // 1. Upload File
            const fileExt = audioFile.name.split('.').pop();
            const cleanName = audioFile.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('audio-materials')
                .upload(filePath, audioFile);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data } = supabase.storage
                .from('audio-materials')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // 3. Insert Record
            const audioData = {
                title,
                description,
                category,
                url: publicUrl,
            };

            const { error: insertError } = await supabase.from('audios').insert(audioData);
            if (insertError) throw insertError;

            toast.success('Audio added successfully');
            setIsDialogOpen(false);
            resetForm();
            fetchAudios();

        } catch (error) {
            console.error('Error saving audio:', error);
            toast.error('Failed to upload audio');
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAudioFile(e.target.files[0]);
        }
    };

    const handleDelete = async (audio: Audio) => {
        try {
            const { error } = await supabase
                .from('audios')
                .delete()
                .eq('id', audio.id);

            if (error) throw error;

            toast.success('Audio deleted');
            fetchAudios();
        } catch (error) {
            console.error('Error deleting audio:', error);
            toast.error('Failed to delete audio');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    🎙️ Manage Audios
                </h2>

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
                                        {CAREGORIES.map((cat) => (
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
                                        accept="audio/*"
                                        onChange={handleFileChange}
                                        required
                                        className="cursor-pointer"
                                    />
                                    {audioFile && (
                                        <div className="text-xs text-green-600 font-medium">
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

            {loading ? (
                <p className="text-muted-foreground">Loading audios...</p>
            ) : audios.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No audio materials found. Upload one to get started.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {audios.map((audio) => (
                        <Card key={audio.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                    <Play className="h-6 w-6 ml-1" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{audio.title}</h3>
                                    {audio.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {audio.description}
                                        </p>
                                    )}
                                    {audio.category && (
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mt-1">
                                            {audio.category}
                                        </span>
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
                                                    Are you sure you want to delete "{audio.title}"? This will check DB record, but doesn't auto-delete file from storage bucket (Supabase limitation).
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
