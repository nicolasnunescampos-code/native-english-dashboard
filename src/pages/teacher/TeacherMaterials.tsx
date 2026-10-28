import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, Material } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Sparkles } from 'lucide-react';
import { getThumbnailSrc } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WorkBookCover = ({ title, level }: { title: string; level?: string }) => {
  const numberStr = title.includes('Beginner')
    ? '1'
    : title.includes('Intermediate')
      ? '2'
      : title.includes('Advanced')
        ? '3'
        : 'K';

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#18181b] via-[#09090b] to-[#000000] border border-zinc-700/60 flex flex-col items-center justify-between p-4 relative overflow-hidden text-zinc-100 select-none shadow-inner">
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
      <div className="w-full flex items-center justify-between border-b border-zinc-700/60 pb-2 z-10">
        <span className="text-[10px] tracking-widest uppercase font-extrabold text-zinc-300">Native English</span>
        <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold uppercase tracking-wider">B&amp;W Activities</span>
      </div>
      <div className="my-auto text-center flex flex-col items-center py-2 z-10 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 border border-zinc-600 flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-zinc-100" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{level ? `${level} Level` : 'Grammar Companion'}</p>
          <h4 className="text-lg font-black text-white tracking-tight uppercase">Work Book</h4>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Same Chapters • Activities Only</p>
        </div>
      </div>
      <div className="w-full flex items-end justify-between border-t border-zinc-800 pt-2 z-10">
        <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">Vol. {numberStr}</span>
        <span className="text-3xl font-black text-zinc-100 tracking-tighter">{numberStr}</span>
      </div>
    </div>
  );
};

const DEFAULT_WORKBOOKS: Material[] = [
  {
    id: -101,
    title: 'Beginner Work Book - A1 / A2',
    category: 'Workbook',
    level: 'Beginner',
    target_audience: 'both',
    description: 'Black & White Edition • Activities & Exercises only. Follows the exact chapter-by-chapter curriculum of Beginner Grammar.',
    url: 'https://drive.google.com/file/d/1HwT-eSUoPEoIsfTKckXuyh9wXtzhtriv/view?usp=drive_link',
    thumbnail_url: '',
  },
  {
    id: -102,
    title: 'Intermediate Work Book - B1 / B2',
    category: 'Workbook',
    level: 'Intermediate',
    target_audience: 'both',
    description: 'Black & White Edition • Activities & Exercises only. Follows the exact chapter-by-chapter curriculum of Intermediate Grammar.',
    url: 'https://drive.google.com/file/d/1C0cj0q34FLRvF5RoViR3tq9yzQDshrQp/view?usp=drive_link',
    thumbnail_url: '',
  },
  {
    id: -103,
    title: 'Advanced Work Book - C1 / C2',
    category: 'Workbook',
    level: 'Advanced',
    target_audience: 'both',
    description: 'Black & White Edition • Activities & Exercises only. Follows the exact chapter-by-chapter curriculum of Advanced Grammar.',
    url: 'https://drive.google.com/file/d/1lbCJy4zINZ5Lb9e4-ICkF1g0v1_UHReS/view?usp=drive_link',
    thumbnail_url: '',
  },
  {
    id: -104,
    title: 'Native Kids Work Book',
    category: 'Workbook',
    level: 'Beginner',
    target_audience: 'both',
    description: 'Black & White Edition • Fun activity worksheets and practice drills for young learners.',
    url: 'https://drive.google.com/file/d/1ShOAvZksXTlz-roSkXMfMShKdGO6PtU_/view?usp=drive_link',
    thumbnail_url: '',
  },
];

const TeacherMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .order('category', { ascending: true })
          .order('level', { ascending: true });

        if (error) throw error;
        setMaterials(data || []);
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  const categories = [
    { key: 'Grammar', label: 'Grammar' },
    { key: 'Workbook', label: 'Work Book' },
    { key: 'Entertainment', label: 'Entertainment' },
    { key: 'Club', label: 'Conversation Club' },
  ];
  const [activeSubCategory, setActiveSubCategory] = useState<"Reading" | "Listening">("Reading");
  const [activeClubSubCategory, setActiveClubSubCategory] = useState<"Reading" | "Listening">("Reading");
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Club'] as const;

  const getMaterialsByCategory = (categoryKey: string) => {
    const list = materials.filter((m) => {
      if (!m.category || m.target_audience?.toLowerCase() === 'student') return false;
      if (categoryKey === 'Entertainment') {
        const targetCat = activeSubCategory;
        return m.category.toLowerCase() === targetCat.toLowerCase();
      }
      if (categoryKey === 'Club') {
        const targetCat = `Club (${activeClubSubCategory})`;
        return m.category.toLowerCase() === targetCat.toLowerCase();
      }
      return m.category.toLowerCase() === categoryKey.toLowerCase();
    });

    const finalMaterials =
      categoryKey === 'Workbook' && list.length === 0 ? DEFAULT_WORKBOOKS : list;

    return finalMaterials.sort((a, b) => {
      const getLevelScore = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('beginner')) return 1;
        if (t.includes('intermediate')) return 2;
        if (t.includes('advanced (1)') || t.includes('advanced 1')) return 3;
        if (t.includes('advanced (2)') || t.includes('advanced 2')) return 4;
        if (t.includes('advanced')) return 3;
        return 5;
      };
      return getLevelScore(a.title) - getLevelScore(b.title);
    });
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-success/10 text-success';
      case 'intermediate':
        return 'bg-warning/10 text-warning';
      case 'advanced':
        return 'bg-destructive/10 text-destructive';
      case 'club':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📚 Books
      </h2>

      <Tabs defaultValue="Grammar" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          {categories.map((category) => (
            <TabsTrigger key={category.key} value={category.key}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            
            {category.key === 'Workbook' && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md mt-4 mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white text-zinc-950 shadow-sm">
                      B&amp;W Activities Edition
                    </span>
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                      Work Book Activities
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    Black and white companion editions to our Grammar Books with the exact same chapter structure, focused exclusively on exercises, drills, and classroom activities.
                  </p>
                </div>
              </div>
            )}

            {category.key === 'Entertainment' && (
              <div className="flex gap-2 mt-4 mb-6">
                <Button
                  size="sm"
                  variant={activeSubCategory === "Reading" ? "secondary" : "outline"}
                  onClick={() => setActiveSubCategory("Reading")}
                >
                  📖 Reading
                </Button>
                <Button
                  size="sm"
                  variant={activeSubCategory === "Listening" ? "secondary" : "outline"}
                  onClick={() => setActiveSubCategory("Listening")}
                >
                  🎧 Listening
                </Button>
              </div>
            )}

            {category.key === 'Club' && (
              <div className="flex gap-2 mt-4 mb-6">
                <Button
                  size="sm"
                  variant={activeClubSubCategory === "Reading" ? "secondary" : "outline"}
                  onClick={() => setActiveClubSubCategory("Reading")}
                >
                  📖 Reading
                </Button>
                <Button
                  size="sm"
                  variant={activeClubSubCategory === "Listening" ? "secondary" : "outline"}
                  onClick={() => setActiveClubSubCategory("Listening")}
                >
                  🎧 Listening
                </Button>
              </div>
            )}

            {levels.map((level) => {
              const levelMaterials = getMaterialsByCategory(category.key).filter(
                (m) => m.level && m.level.toLowerCase() === level.toLowerCase()
              );

              if (levelMaterials.length === 0) return null;

              return (
                <div key={level}>
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <Badge className={getLevelColor(level)}>{level}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {levelMaterials.map((material, index) => (
                      <Card key={index} className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full border-muted-foreground/20">
                        <div className="w-full aspect-video bg-muted relative shrink-0 overflow-hidden">
                          {category.key === 'Workbook' && !material.thumbnail_url ? (
                            <WorkBookCover title={material.title} level={material.level} />
                          ) : (
                            <img
                              src={getThumbnailSrc(material.thumbnail_url || '', material.url)}
                              alt={material.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://placehold.co/600x400/2a2a2a/ffffff?text=Material';
                              }}
                            />
                          )}
                        </div>
                        <CardContent className="p-4 flex flex-col flex-1">
                          <h4 className="font-semibold text-lg leading-tight line-clamp-1 mb-2">{material.title}</h4>
                          {material.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 mb-4 flex-1">
                              {material.description}
                            </p>
                          )}
                          <Button size="sm" variant="default" asChild className="w-full mt-auto shadow-sm">
                            <a href={material.url} target="_blank" rel="noopener noreferrer">
                              Open Material
                              <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Other / Uncategorized Levels */}
            {(() => {
              const categoryMaterials = getMaterialsByCategory(category.key);
              const knownLevels = levels.map((l) => l.toLowerCase());
              const otherMaterials = categoryMaterials.filter(
                (m) => !m.level || !knownLevels.includes(m.level.toLowerCase())
              );

              if (otherMaterials.length === 0) return null;

              return (
                <div key="other">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <Badge variant="secondary">Other Resources</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherMaterials.map((material, index) => (
                      <Card key={`other-${index}`} className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full border-muted-foreground/20">
                        <div className="w-full aspect-video bg-muted relative shrink-0 overflow-hidden">
                          {category.key === 'Workbook' && !material.thumbnail_url ? (
                            <WorkBookCover title={material.title} level={material.level} />
                          ) : (
                            <img
                              src={getThumbnailSrc(material.thumbnail_url || '', material.url)}
                              alt={material.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://placehold.co/600x400/2a2a2a/ffffff?text=Material';
                              }}
                            />
                          )}
                        </div>
                        <CardContent className="p-4 flex flex-col flex-1">
                          <h4 className="font-semibold text-lg leading-tight line-clamp-1 mb-2">{material.title}</h4>
                          {material.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 mb-4 flex-1">
                              {material.description}
                            </p>
                          )}
                          <Button size="sm" variant="default" asChild className="w-full mt-auto shadow-sm">
                            <a href={material.url} target="_blank" rel="noopener noreferrer">
                              Open Material
                              <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {getMaterialsByCategory(category.key).length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No materials available in this category
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TeacherMaterials;
