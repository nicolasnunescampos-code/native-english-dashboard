import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AUDIO_CATEGORIES, ExtendedAudio, fetchAllAudios } from "@/lib/audioCatalog"
import { Play } from "lucide-react"

const StudentAudios = () => {
  const [audios, setAudios] = useState<ExtendedAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Beginner");

  useEffect(() => {
    const loadAudios = async () => {
      try {
        const data = await fetchAllAudios();
        // Order ascending by id for students so chapters appear in natural order
        const sorted = [...data].sort((a, b) => (a.id || 0) - (b.id || 0));
        setAudios(sorted);
      } finally {
        setLoading(false);
      }
    };
    loadAudios();
  }, []);

  const filteredAudios = audios.filter(audio =>
    (audio.category || "Beginner") === activeCategory
  );

  if (loading) return <p className="text-muted-foreground p-6">Loading audios...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        🎧 Audio Materials
      </h2>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {AUDIO_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            onClick={() => setActiveCategory(cat)}
            size="sm"
          >
            {cat}
          </Button>
        ))}
      </div>

      {filteredAudios.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No audio materials available for {activeCategory}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAudios.map((audio) => (
            <Card key={audio.id || audio.url} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="h-12 w-12 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
                  <Play className="h-6 w-6 ml-1" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-medium">{audio.title}</h3>
                  {audio.description && (
                    <p className="text-sm text-muted-foreground">
                      {audio.description}
                    </p>
                  )}
                </div>
                <div className="w-full sm:w-auto">
                  <audio controls src={audio.url} className="w-full sm:w-64 h-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAudios;
