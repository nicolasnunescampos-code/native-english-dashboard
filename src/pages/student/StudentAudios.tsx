import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const StudentAudios = () => {
  const [audios, setAudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Beginner");

  const CATEGORIES = ["Beginner", "Intermediate", "Advanced 1", "Advanced 2"];

  useEffect(() => {
    const fetchAudios = async () => {
      const { data } = await supabase
        .from('audios')
        .select('*')
        .order('id', { ascending: true });
      setAudios(data || []);
      setLoading(false);
    };
    fetchAudios();
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
        {CATEGORIES.map((cat) => (
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
            <Card key={audio.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3" /></svg>
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
