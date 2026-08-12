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
]

const StudentMaterials = () => {
  const [materials, setMaterials] = useState<Material[]>([])
  const [activeCategory, setActiveCategory] = useState("Grammar")
  const [activeSubCategory, setActiveSubCategory] = useState<"Reading" | "Listening">("Reading")
  const [activeClubSubCategory, setActiveClubSubCategory] = useState<"Reading" | "Listening">("Reading")
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

  const filtered = materials
    .filter(
      (m) => {
        if (!m.category || m.target_audience?.toLowerCase() === 'teacher') return false;
        if (activeCategory === "Entertainment") {
          const targetCat = activeSubCategory;
          return m.category.toLowerCase() === targetCat.toLowerCase();
        }
        if (activeCategory === "Club") {
          const targetCat = `Club (${activeClubSubCategory})`;
          return m.category.toLowerCase() === targetCat.toLowerCase();
        }
        return m.category.toLowerCase() === activeCategory.toLowerCase();
      }
    )
    .sort((a, b) => {
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

  if (loading) {
    return <p className="text-muted-foreground">Loading materials...</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📚 Books</h2>

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

      {/* Secondary Tabs for Entertainment */}
      {activeCategory === "Entertainment" && (
        <div className="flex gap-2">
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


      {/* Secondary Tabs for Club */}
      {activeCategory === "Club" && (
        <div className="flex gap-2">
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
    </div>
  )
}

export default StudentMaterials
