import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  Play,
  ChevronLeft,
  Star,
  Users,
  Sparkles,
  BookOpen,
  User as UserIcon,
  Radio,
} from 'lucide-react';
import {
  supabase,
  Video,
  isVideoCourseItem,
  cleanVideoDescription,
  sortVideosByNumber,
  getVideoBadgeLabel,
} from '@/lib/supabase';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  return match ? match[1] || match[2] : null;
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
  return `${import.meta.env.BASE_URL}video-course-hero.jpg`;
};

const PLACEHOLDER_MODULES = [
  {
    id: -1,
    badge: 'CHAPTER 01',
    title: 'Foundations & Essential Structures',
    level: 'Beginner',
    description: 'Core sentence patterns, everyday greetings, and essential pronunciation.',
  },
  {
    id: -2,
    badge: 'CHAPTER 02',
    title: 'Everyday Conversations & Listening',
    level: 'Beginner',
    description: 'Real-world dialogues, active listening strategies, and natural phrasing.',
  },
  {
    id: -3,
    badge: 'CHAPTER 01',
    title: 'Connecting Ideas & Past Tenses',
    level: 'Intermediate',
    description: 'Storytelling, past experiences, and linking thoughts smoothly in English.',
  },
  {
    id: -4,
    badge: 'CHAPTER 02',
    title: 'Intermediate Fluency & Idioms',
    level: 'Intermediate',
    description: 'Phrasal verbs, native expressions, and confident daily communication.',
  },
  {
    id: -5,
    badge: 'CHAPTER 01',
    title: 'Advanced Nuance & Debate',
    level: 'Advanced',
    description: 'Complex grammar structures, persuasive speaking, and native speed.',
  },
  {
    id: -6,
    badge: 'CHAPTER 02',
    title: 'Mastery & Professional English',
    level: 'Advanced',
    description: 'Executive communication, cultural idioms, and complete fluency.',
  },
];

const VideoCard = ({
  video,
  index,
  badgeOverride,
}: {
  video: Video;
  index: number;
  badgeOverride?: string;
}) => {
  const badgeLabel = badgeOverride || getVideoBadgeLabel(video, index);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group relative w-[240px] sm:w-[255px] h-[330px] rounded-xl overflow-hidden cursor-pointer bg-[#07142b] border border-sky-400/20 transition-all duration-300 hover:scale-[1.04] hover:z-30 hover:border-sky-400/70 hover:shadow-[0_12px_35px_-5px_rgba(14,165,233,0.45)] shrink-0">
          {/* Background Image with dark-blue atmosphere */}
          <img
            src={getThumbnailSrc(video.thumbnail_url, video.youtube_url)}
            alt={video.title}
            className="w-full h-full object-cover opacity-75 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}video-course-hero.jpg`;
            }}
          />

          {/* Deep blue atmospheric tint + bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030917] via-[#061531]/45 to-[#061531]/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020712] via-[#040d21]/60 to-transparent" />

          {/* Top-left Badge */}
          <div className="absolute top-3.5 left-3.5 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-extrabold uppercase tracking-wider bg-sky-500/90 text-white shadow-[0_0_15px_rgba(14,165,233,0.65)] backdrop-blur-sm border border-sky-300/40">
              {badgeOverride === 'LIVE CLASS' && (
                <Radio className="w-3 h-3 text-sky-200 animate-pulse" />
              )}
              <span>{badgeLabel}</span>
            </span>
          </div>

          {/* Level Pill Top-Right */}
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#07152e]/80 text-sky-300 border border-sky-400/30 backdrop-blur-md">
              {video.level}
            </span>
          </div>

          {/* Center Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#030917]/40 backdrop-blur-[2px]">
            <div className="w-14 h-14 rounded-full bg-sky-500/90 border border-sky-300/60 flex items-center justify-center shadow-[0_0_25px_rgba(14,165,233,0.8)] transform scale-90 group-hover:scale-105 transition-transform">
              <Play className="h-6 w-6 text-white fill-current ml-0.5" />
            </div>
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <h3 className="font-bold text-base text-white mb-1 line-clamp-2 group-hover:text-sky-200 transition-colors whitespace-normal leading-snug">
              {video.title}
            </h3>
            {video.description && (
              <p className="text-xs text-slate-300/85 line-clamp-2 whitespace-normal leading-relaxed mt-1">
                {video.description}
              </p>
            )}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 bg-black border border-sky-500/30 overflow-hidden aspect-video shadow-[0_0_50px_rgba(14,165,233,0.3)]">
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
  );
};

const StudentVideoCourse: React.FC = () => {
  const { studentName, teacherName, role } = useAuth();
  const navigate = useNavigate();

  const [courseVideos, setCourseVideos] = useState<Video[]>([]);
  const [liveClassVideos, setLiveClassVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<
    'all' | 'video_course' | 'live_classes'
  >('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [userRating, setUserRating] = useState<number>(5);

  const displayName =
    role === 'student'
      ? studentName || 'Student'
      : role === 'teacher'
        ? teacherName || 'Teacher'
        : 'Admin';

  const dashboardPath =
    role === 'teacher' ? '/teacher' : role === 'admin' ? '/admin' : '/student';
  const communityPath =
    role === 'teacher'
      ? '/teacher/messages'
      : role === 'admin'
        ? '/admin/messages'
        : '/student/messages';

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase.from('videos').select('*');

      if (!error && data) {
        const courseItems = data
          .filter((v) => isVideoCourseItem(v))
          .map((v) => ({
            ...v,
            description: cleanVideoDescription(v.description),
          }))
          .sort(sortVideosByNumber);

        const liveItems = data
          .filter((v) => !isVideoCourseItem(v))
          .sort(sortVideosByNumber);

        setCourseVideos(courseItems);
        setLiveClassVideos(liveItems);
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);

  const totalLessonsCount = courseVideos.length + liveClassVideos.length;

  const liveClassesByLevel = {
    Beginner: liveClassVideos.filter((v) => v.level === 'Beginner'),
    Intermediate: liveClassVideos.filter((v) => v.level === 'Intermediate'),
    Advanced: liveClassVideos.filter((v) => v.level === 'Advanced'),
  };

  const courseVideosByLevel = {
    Beginner: courseVideos.filter((v) => v.level === 'Beginner'),
    Intermediate: courseVideos.filter((v) => v.level === 'Intermediate'),
    Advanced: courseVideos.filter((v) => v.level === 'Advanced'),
  };

  const firstVideo = courseVideos[0] || liveClassVideos[0] || null;

  const heroBgUrl = `${import.meta.env.BASE_URL}video-course-hero.jpg`;

  if (loading) {
    return (
      <div className="min-h-[85vh] rounded-3xl bg-[#040a18] flex items-center justify-center text-sky-200/70">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 animate-spin text-sky-400" />
          <span>Loading Native English Video Course...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#040a18] text-white pb-20 overflow-x-hidden">
      {/* ======================================================== */}
      {/* IMMERSIVE DARK-BLUE HERO SECTION                         */}
      {/* ======================================================== */}
      <div className="relative min-h-[540px] lg:min-h-[600px] w-full flex flex-col justify-between overflow-hidden">
        {/* Background Artwork */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('${heroBgUrl}')`,
          }}
        />

        {/* Deep Midnight Blue Overlays for readability and mood */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030814] via-[#061229]/90 to-[#061229]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040a18] via-[#040a18]/40 to-[#030814]/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.18),transparent_55%)] pointer-events-none" />

        {/* TOP BAR: Logo on Left, Student Status Pod on Right */}
        <div className="relative z-20 flex items-center justify-between px-6 sm:px-10 lg:px-14 pt-6 sm:pt-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.35)] backdrop-blur-md">
              <span className="text-sky-300 font-black text-base tracking-tight">
                NE
              </span>
            </div>
            <span className="font-black text-lg sm:text-xl tracking-wider uppercase text-white drop-shadow">
              NATIVE ENGLISH
            </span>
          </div>

          {/* Right User Pod */}
          <div className="flex items-center gap-3 bg-[#08152f]/80 hover:bg-[#0b1c3d]/90 backdrop-blur-xl border border-sky-400/25 rounded-2xl px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-colors">
            <div className="w-8 h-8 rounded-full border border-sky-400/40 bg-sky-500/15 flex items-center justify-center text-sky-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block pr-1">
              <p className="text-[10px] font-medium text-sky-300/75 uppercase tracking-wider">
                {totalLessonsCount} Recorded{' '}
                {totalLessonsCount === 1 ? 'Lesson' : 'Lessons'}
              </p>
              <p className="text-xs font-extrabold text-white truncate max-w-[140px]">
                {displayName}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* CENTER-LEFT HERO CONTENT */}
        <div className="relative z-20 px-6 sm:px-10 lg:px-14 my-auto py-8 max-w-2xl space-y-5">
          {/* < BACK button */}
          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sky-300/90 hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          {/* Stars & Course Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setUserRating(star);
                      toast.success(
                        `Thank you for rating the course ${star}.0 stars!`
                      );
                    }}
                    className="focus:outline-none hover:scale-110 transition-transform"
                    title={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= userRating
                          ? 'text-indigo-400 fill-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-300">
                ({userRating.toFixed(1).replace('.', ',')})
              </span>
            </div>

            <div className="flex items-center gap-5 text-xs font-semibold text-slate-200/90">
              <button
                type="button"
                onClick={() =>
                  toast.success(
                    'Thanks for your feedback on the Native English Video Course!'
                  )
                }
                className="inline-flex items-center gap-1.5 hover:text-sky-300 transition-colors underline-offset-4 hover:underline"
              >
                <Star className="w-3.5 h-3.5 text-sky-400" />
                <span>Rate this course</span>
              </button>

              <Link
                to={communityPath}
                className="inline-flex items-center gap-1.5 hover:text-sky-300 transition-colors underline-offset-4 hover:underline"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Community</span>
              </Link>
            </div>
          </div>

          {/* Main Course Heading & Subtitle */}
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              Native English Video Course
            </h1>
            <p className="text-sm sm:text-base text-slate-300/90 max-w-xl leading-relaxed">
              Master real-world English through structured video lessons, level
              by level, plus our complete archive of live class recordings.
            </p>
          </div>

          {/* "Start course:" Glass Box */}
          <div className="pt-1">
            {firstVideo ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="w-full sm:w-[430px] text-left rounded-lg p-4 bg-[#07132c]/65 hover:bg-[#0b1d42]/80 border border-sky-300/40 hover:border-sky-300/80 backdrop-blur-md transition-all duration-300 group shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                  >
                    <p className="text-xs font-medium text-slate-300 mb-2">
                      Start course:
                    </p>
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full border-2 border-white/85 group-hover:border-sky-300 group-hover:bg-sky-500/20 flex items-center justify-center shrink-0 transition-all">
                        <Play className="w-4 h-4 text-white group-hover:text-sky-200 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm sm:text-base text-white truncate group-hover:text-sky-200 transition-colors">
                          {firstVideo.title}
                        </p>
                        <p className="text-xs text-slate-300/80 truncate">
                          {firstVideo.level} Level •{' '}
                          {firstVideo.description || 'Recorded Class Lesson'}
                        </p>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 bg-black border border-sky-500/30 overflow-hidden aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={getVideoSrc(firstVideo.youtube_url)}
                    title={firstVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <button
                type="button"
                onClick={() =>
                  toast.info('New recorded lessons will be available here soon!')
                }
                className="w-full sm:w-[430px] text-left rounded-lg p-4 bg-[#07132c]/65 hover:bg-[#0b1d42]/80 border border-sky-300/40 hover:border-sky-300/80 backdrop-blur-md transition-all duration-300 group shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                <p className="text-xs font-medium text-slate-300 mb-2">
                  Start course:
                </p>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full border-2 border-white/85 group-hover:border-sky-300 group-hover:bg-sky-500/20 flex items-center justify-center shrink-0 transition-all">
                    <Play className="w-4 h-4 text-white group-hover:text-sky-200 fill-current ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm sm:text-base text-white truncate">
                      Module 1 - Video Course
                    </p>
                    <p className="text-xs text-slate-300/80 truncate">
                      Lesson 1 - Foundations & Introduction
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* HERO BOTTOM BAR: CLEAN MODULE & LEVEL CONTROLS           */}
        {/* ======================================================== */}
        <div className="relative z-20 px-6 sm:px-10 lg:px-14 pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-sky-500/15 pt-4 bg-[#040a18]/70 backdrop-blur-md">
          {/* Module Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedModule('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                selectedModule === 'all'
                  ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.6)]'
                  : 'bg-[#08152f]/80 text-slate-300 hover:text-white border border-sky-400/25 hover:border-sky-400/50'
              }`}
            >
              <span>All Modules</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedModule('video_course')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                selectedModule === 'video_course'
                  ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.6)]'
                  : 'bg-[#08152f]/80 text-slate-300 hover:text-white border border-sky-400/25 hover:border-sky-400/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-200" />
              <span>Module 1: Video Course</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/35 text-sky-300 border border-sky-400/20">
                {courseVideos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedModule('live_classes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                selectedModule === 'live_classes'
                  ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.6)]'
                  : 'bg-[#08152f]/80 text-slate-300 hover:text-white border border-sky-400/25 hover:border-sky-400/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-sky-200" />
              <span>Module 2: Live Classes</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/35 text-sky-300 border border-sky-400/20">
                {liveClassVideos.length}
              </span>
            </button>
          </div>

          {/* Level Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1 font-semibold hidden sm:inline">
              Level:
            </span>
            {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedLevel === lvl
                    ? 'bg-sky-400 text-[#040a18] shadow-[0_0_12px_rgba(56,189,248,0.7)]'
                    : 'bg-[#08152f]/70 text-slate-300 hover:text-white border border-sky-400/20'
                }`}
              >
                {lvl === 'All' ? 'All Levels' : lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN MODULE SECTIONS                                     */}
      {/* ======================================================== */}
      <div className="relative z-20 px-6 sm:px-10 lg:px-14 pt-10 space-y-16">
        {/* ======================================================== */}
        {/* MODULE 1: VIDEO COURSE (THEN THE LEVELS)                  */}
        {/* ======================================================== */}
        {(selectedModule === 'all' || selectedModule === 'video_course') && (
          <div className="space-y-8">
            {/* Module 1 Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#071738]/90 via-[#0a1e4a]/60 to-[#07142b]/40 border border-sky-400/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-extrabold uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-sky-300" />
                  <span>Module 1</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>Video Course</span>
                  <span className="text-xs font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 px-3 py-1 rounded-full">
                    {courseVideos.length}{' '}
                    {courseVideos.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                </h2>
                <p className="text-sm text-slate-300/85 max-w-2xl">
                  Self-paced recorded lessons covering grammar, pronunciation,
                  vocabulary, and natural speaking skills organized by level.
                </p>
              </div>
            </div>

            {/* Levels inside Module 1 */}
            <div className="space-y-10 pl-1 sm:pl-2">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map(
                (lvl) => {
                  if (selectedLevel !== 'All' && selectedLevel !== lvl)
                    return null;
                  const levelVideos = courseVideosByLevel[lvl];
                  const placeholderList = PLACEHOLDER_MODULES.filter(
                    (m) => m.level === lvl
                  );

                  return (
                    <div key={`course-${lvl}`} className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                          <span className="w-2 h-5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                          <span>{lvl} Level</span>
                          <span className="text-xs font-semibold text-sky-300/70 bg-sky-500/10 border border-sky-400/20 px-2.5 py-0.5 rounded-full">
                            {courseVideos.length > 0
                              ? levelVideos.length
                              : placeholderList.length}{' '}
                            {(courseVideos.length > 0
                              ? levelVideos.length
                              : placeholderList.length) === 1
                              ? 'lesson'
                              : 'lessons'}
                          </span>
                        </h3>
                      </div>

                      {courseVideos.length > 0 ? (
                        levelVideos.length > 0 ? (
                          <ScrollArea className="w-full whitespace-nowrap rounded-xl">
                            <div className="flex w-max space-x-5 py-3">
                              {levelVideos.map((video, idx) => (
                                <VideoCard
                                  key={video.id}
                                  video={video}
                                  index={idx}
                                />
                              ))}
                            </div>
                            <ScrollBar
                              orientation="horizontal"
                              className="bg-sky-950/50"
                            />
                          </ScrollArea>
                        ) : (
                          <div className="rounded-xl bg-[#07142b]/40 border border-sky-400/15 p-6 text-slate-400 text-sm">
                            No recorded lessons for {lvl} level yet. New lessons
                            will be published here soon.
                          </div>
                        )
                      ) : (
                        /* Placeholders shown when no course videos exist yet */
                        <ScrollArea className="w-full whitespace-nowrap rounded-xl">
                          <div className="flex w-max space-x-5 py-3">
                            {placeholderList.map((mod) => (
                              <div
                                key={mod.id}
                                onClick={() =>
                                  toast.info(
                                    `${mod.badge}: "${mod.title}" will be unlocked as soon as recorded lessons are posted.`
                                  )
                                }
                                className="group relative w-[240px] sm:w-[255px] h-[330px] rounded-xl overflow-hidden cursor-pointer bg-[#07142b] border border-sky-400/20 transition-all duration-300 hover:scale-[1.03] hover:border-sky-400/60 hover:shadow-[0_12px_35px_-5px_rgba(14,165,233,0.4)] shrink-0"
                              >
                                <img
                                  src={heroBgUrl}
                                  alt={mod.title}
                                  className="w-full h-full object-cover object-right opacity-55 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020712] via-[#061531]/65 to-[#061531]/30" />

                                <div className="absolute top-3.5 left-3.5 z-10">
                                  <span className="inline-block px-2.5 py-1 rounded-[4px] text-[11px] font-extrabold uppercase tracking-wider bg-sky-500/90 text-white shadow-[0_0_15px_rgba(14,165,233,0.65)]">
                                    {mod.badge}
                                  </span>
                                </div>

                                <div className="absolute top-3.5 right-3.5 z-10">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#07152e]/85 text-sky-300 border border-sky-400/30">
                                    {mod.level}
                                  </span>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                  <h3 className="font-bold text-base text-white mb-1 whitespace-normal leading-snug group-hover:text-sky-200 transition-colors">
                                    {mod.title}
                                  </h3>
                                  <p className="text-xs text-slate-300/80 line-clamp-2 whitespace-normal leading-relaxed">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <ScrollBar
                            orientation="horizontal"
                            className="bg-sky-950/50"
                          />
                        </ScrollArea>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 2: LIVE CLASSES (THEN THE LEVELS)                  */}
        {/* ======================================================== */}
        {(selectedModule === 'all' || selectedModule === 'live_classes') && (
          <div
            className={`space-y-8 ${
              selectedModule === 'all' ? 'pt-8 border-t border-sky-500/15' : ''
            }`}
          >
            {/* Module 2 Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b1736]/90 via-[#131e42]/60 to-[#07142b]/40 border border-sky-400/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-extrabold uppercase tracking-wider">
                  <Radio className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
                  <span>Module 2</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>Live Classes</span>
                  <span className="text-xs font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 px-3 py-1 rounded-full">
                    {liveClassVideos.length}{' '}
                    {liveClassVideos.length === 1 ? 'class' : 'classes'}
                  </span>
                </h2>
                <p className="text-sm text-slate-300/85 max-w-2xl">
                  Full library of recorded live interactive group classes with
                  Native English teachers, organized by proficiency level.
                </p>
              </div>
            </div>

            {/* Levels inside Module 2 */}
            {liveClassVideos.length === 0 ? (
              <div className="rounded-2xl bg-[#07142b]/60 border border-sky-400/20 p-8 text-center text-slate-300/80">
                No recorded live classes available yet.
              </div>
            ) : (
              <div className="space-y-10 pl-1 sm:pl-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(
                  (lvl) => {
                    if (selectedLevel !== 'All' && selectedLevel !== lvl)
                      return null;
                    const levelList = liveClassesByLevel[lvl];
                    if (levelList.length === 0) return null;

                    return (
                      <div key={`live-${lvl}`} className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                            <span className="w-2 h-5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                            <span>Live Classes • {lvl} Level</span>
                            <span className="text-xs font-semibold text-sky-300/70 bg-sky-500/10 border border-sky-400/20 px-2.5 py-0.5 rounded-full">
                              {levelList.length}{' '}
                              {levelList.length === 1 ? 'class' : 'classes'}
                            </span>
                          </h3>
                        </div>

                        <ScrollArea className="w-full whitespace-nowrap rounded-xl">
                          <div className="flex w-max space-x-5 py-3">
                            {levelList.map((video, idx) => (
                              <VideoCard
                                key={video.id}
                                video={video}
                                index={idx}
                                badgeOverride="LIVE CLASS"
                              />
                            ))}
                          </div>
                          <ScrollBar
                            orientation="horizontal"
                            className="bg-sky-950/50"
                          />
                        </ScrollArea>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentVideoCourse;
