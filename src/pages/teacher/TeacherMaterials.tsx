import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, Material } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
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
    { key: 'business', label: 'Business' },
    { key: 'Grammar', label: 'Grammar' },
    { key: 'Entertainment', label: 'Entertainment' },
    { key: 'Club', label: 'Conversation Club' },
  ];
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Business', 'Club'] as const;

  const getMaterialsByCategory = (categoryKey: string) => {
    return materials.filter((m) => 
      m.category && 
      m.category.toLowerCase() === categoryKey.toLowerCase() &&
      m.target_audience?.toLowerCase() !== 'student'
    );
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-success/10 text-success';
      case 'intermediate':
        return 'bg-warning/10 text-warning';
      case 'advanced':
        return 'bg-destructive/10 text-destructive';
      case 'business':
        return 'bg-blue-500/10 text-blue-500';
      case 'club':
        return 'bg-purple-500/10 text-purple-500';
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
        📚 Teaching Materials
      </h2>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          {categories.map((category) => (
            <TabsTrigger key={category.key} value={category.key}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
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
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">{material.title}</h4>
                          <Button size="sm" variant="outline" asChild className="w-full">
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
                      <Card key={`other-${index}`} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">{material.title}</h4>
                          <Button size="sm" variant="outline" asChild className="w-full">
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
