import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { getThumbnailSrc } from "@/lib/utils"

interface Material {
  id: number
  title: string
  title: string
  description: string | null
  url: string
  thumbnail_url?: string
  category: string
  target_audience?: string
}

const CATEGORIES = [
  { key: "Grammar", label: "Grammar" },
  { key: "Entertainment", label: "Entertainment" },
  { key: "Club", label: "Conversation Club" },
  { key: "business", label: "Business" },
]

const StudentMaterials = () => {
  const [materials, setMaterials] = useState<Material[]>([])
  const [activeCategory, setActiveCategory] = useState("Grammar")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMaterials = async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("id", { ascending: true })

      if (!error && data) {
        setMaterials(data)
      }

      setLoading(false)
    }

    loadMaterials()
  }, [])

  const filtered = materials.filter(
    (m) => m.category && 
           m.category.toLowerCase() === activeCategory.toLowerCase() && 
           m.target_audience?.toLowerCase() !== 'teacher'
  )

  if (loading) {
    return <p className="text-muted-foreground">Loading materials...</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📚 Learning Materials</h2>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? "default" : "outline"}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Materials */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No materials available in this category
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((material) => (
            <Card key={material.id} className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full border-muted-foreground/20">
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
                <h3 className="font-semibold text-lg leading-tight line-clamp-1 mb-2">{material.title}</h3>
                {material.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2 mb-4 flex-1">
                    {material.description}
                  </p>
                )}
                <Button asChild variant="default" className="w-full mt-auto shadow-sm">
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Material
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Audio Section */}
      <div className="mt-12 pt-8 border-t">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          🎧 Audio Materials
        </h2>
        <AudioMaterialsList />
      </div>
    </div>
  )
}

const AudioMaterialsList = () => {
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

  if (loading) return <p className="text-muted-foreground">Loading audios...</p>;

  return (
    <div className="space-y-6">
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

export default StudentMaterials
