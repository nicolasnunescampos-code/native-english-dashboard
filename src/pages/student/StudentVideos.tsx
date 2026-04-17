import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase, Video } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getDriveId = (url: string) => {
  const regExp = /\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return match ? (match[1] || match[2]) : null;
};

const getVideoSrc = (url: string) => {
  const youtubeId = getYoutubeId(url);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
  }

  const driveId = getDriveId(url);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview?autoplay=1`;
  }

  return url;
};

const getThumbnailSrc = (url: string) => {
  const driveId = getDriveId(url);
  if (driveId) {
    return `https://drive.google.com/uc?export=view&id=${driveId}`;
  }
  return url;
};

const VideoRow = ({ title, videos }: { title: string; videos: Video[] }) => {
  if (videos.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-2xl font-semibold text-foreground px-4 md:px-0 flex items-center gap-2">
        {title}
      </h2>

      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex w-max space-x-4 p-4">
          {videos.map((video) => (
            <Dialog key={video.id}>
              <DialogTrigger asChild>
                <div className="group relative w-[280px] h-[380px] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-50 hover:shadow-xl ring-0 hover:ring-2 ring-primary/50">
                  <img
                    src={getThumbnailSrc(video.thumbnail_url)}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/280x380/1a1a1a/ffffff?text=No+Image';
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                    <div className="bg-primary/90 rounded-full p-4 shadow-lg transform scale-90 group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-primary-foreground fill-current ml-1" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="font-bold text-lg text-white mb-1 line-clamp-1 group-hover:line-clamp-none whitespace-normal">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-gray-300 line-clamp-2 white-space-normal mb-2 whitespace-normal h-0 group-hover:h-auto opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 bg-black border-none overflow-hidden aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={getVideoSrc(video.youtube_url)}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="bg-muted" />
      </ScrollArea>
    </div>
  );
};

const StudentVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*');

      if (!error && data) {
        // Natural sort to handle "Chapter 1", "Chapter 2", "Chapter 10" correctly
        const sortedData = data.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        );
        setVideos(sortedData);
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);

  const videosByLevel = {
    Beginner: videos.filter((v) => v.level === 'Beginner'),
    Intermediate: videos.filter((v) => v.level === 'Intermediate'),
    Advanced: videos.filter((v) => v.level === 'Advanced'),
  };

  if (loading) {
    return <div className="text-center p-10 text-muted-foreground">Loading library...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent -m-4 sm:-m-6 lg:-m-8">
      {/* Hero / Banner Area */}
      <div className="relative h-[40vh] bg-[#1e3a8a] flex items-end p-8 mb-6">
        <div className="relative z-10 max-w-2xl px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Native Video Course
          </h1>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VideoRow title="Beginner Level" videos={videosByLevel.Beginner} />
        <VideoRow title="Intermediate Level" videos={videosByLevel.Intermediate} />
        <VideoRow title="Advanced Level" videos={videosByLevel.Advanced} />
      </div>
    </div>
  );
};

export default StudentVideos;
