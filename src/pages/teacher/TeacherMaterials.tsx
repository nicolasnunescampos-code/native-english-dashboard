import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, Material } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { getThumbnailSrc } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    { key: 'Entertainment', label: 'Entertainment' },
    { key: 'Club', label: 'Conversation Club' },
  ];
  const [activeSubCategory, setActiveSubCategory] = useState<"Reading" | "Listening">("Reading");
  const [activeClubSubCategory, setActiveClubSubCategory] = useState<"Reading" | "Listening">("Reading");
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Club'] as const;

  const getMaterialsByCategory = (categoryKey: string) => {
    return materials.filter((m) => {
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
    }).sort((a, b) => {
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
                          <img
                              src={getThumbnailSrc(material.thumbnail_url || '', material.url)}
                              alt={material.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                              onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/2a2a2a/ffffff?text=Material';
                              }}
                          />
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
                          <img
                              src={getThumbnailSrc(material.thumbnail_url || '', material.url)}
                              alt={material.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                              onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/2a2a2a/ffffff?text=Material';
                              }}
                          />
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
