import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ExternalLink,
  BookOpen,
  FileText,
  ListChecks,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { getThumbnailSrc } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SPEAKING_BOOKS } from "@/data/speakingCurriculum"

interface Material {
  id: number
  title: string
  description: string | null
  url: string
  thumbnail_url?: string
  category: string
  level?: string
  target_audience?: string
}

const CATEGORIES = [
  { key: "Grammar", label: "Grammar" },
  { key: "Workbook", label: "Work Book" },
  { key: "Entertainment", label: "Entertainment" },
  { key: "Club", label: "Conversation Club" },
]

// Fallback curated Work Books matching the exact chapter structure of the grammar books
const DEFAULT_WORKBOOKS: Material[] = [
  {
    id: -101,
    title: "Beginner Work Book - A1 / A2",
    category: "Workbook",
    level: "Beginner",
    target_audience: "both",
    description:
      "Black & White Edition • Activities & Exercises only. Follows the exact chapter-by-chapter curriculum of Beginner Grammar.",
    url: "https://drive.google.com/file/d/1HwT-eSUoPEoIsfTKckXuyh9wXtzhtriv/view?usp=drive_link",
    thumbnail_url: "",
  },
  {
    id: -102,
    title: "Intermediate Work Book - B1 / B2",
    category: "Workbook",
    level: "Intermediate",
    target_audience: "both",
    description:
      "Black & White Edition • Activities & Exercises only. Follows the exact chapter-by-chapter curriculum of Intermediate Grammar.",
    url: "https://drive.google.com/file/d/1C0cj0q34FLRvF5RoViR3tq9yzQDshrQp/view?usp=drive_link",
    thumbnail_url: "",
  },
  {
    id: -103,
    title: "Advanced Work Book - C1 / C2",
    category: "Workbook",
    level: "Advanced",
    target_audience: "both",
    description:
      "Black & White Edition • Activities & Exercises only. Follows the exact chapter-by-chapter curriculum of Advanced Grammar.",
    url: "https://drive.google.com/file/d/1lbCJy4zINZ5Lb9e4-ICkF1g0v1_UHReS/view?usp=drive_link",
    thumbnail_url: "",
  },
  {
    id: -104,
    title: "Native Kids Work Book",
    category: "Workbook",
    level: "Beginner",
    target_audience: "both",
    description:
      "Black & White Edition • Fun activity worksheets, word tracing, and practice drills for young learners.",
    url: "https://drive.google.com/file/d/1ShOAvZksXTlz-roSkXMfMShKdGO6PtU_/view?usp=drive_link",
    thumbnail_url: "",
  },
]

function getChaptersForMaterial(material: Material) {
  const title = (material.title || "").toLowerCase()
  const level = (material.level || "").toLowerCase()

  if (title.includes("kids")) {
    return [
      {
        chapterNumber: 1,
        title: "Letters & Phonics",
        grammarFocus: "Alphabet sounds, word tracing, and matching activities.",
      },
      {
        chapterNumber: 2,
        title: "Colors & Shapes",
        grammarFocus: "Visual identification, spelling drills, and drawing tasks.",
      },
      {
        chapterNumber: 3,
        title: "Animals & Pets",
        grammarFocus: "Vocabulary matching, animal sounds, and simple sentences.",
      },
      {
        chapterNumber: 4,
        title: "Numbers & Counting",
        grammarFocus: "Counting items, number words, and basic plural forms.",
      },
      {
        chapterNumber: 5,
        title: "My Family & School",
        grammarFocus: "Family members, classroom objects, and dialogue practice.",
      },
    ]
  }

  if (level.includes("beginner") || title.includes("beginner")) {
    const book = SPEAKING_BOOKS.find((b) => b.id === "beginner-grammar")
    return (
      book?.chapters.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        grammarFocus: `${c.grammarFocus} (Activities & Practice)`,
      })) || []
    )
  }

  if (level.includes("intermediate") || title.includes("intermediate")) {
    const book = SPEAKING_BOOKS.find((b) => b.id === "intermediate-grammar")
    return (
      book?.chapters.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        grammarFocus: `${c.grammarFocus} (Activities & Practice)`,
      })) || []
    )
  }

  if (level.includes("advanced") || title.includes("advanced")) {
    const book = SPEAKING_BOOKS.find((b) => b.id === "advanced-grammar")
    return (
      book?.chapters.map((c) => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        grammarFocus: `${c.grammarFocus} (Activities & Practice)`,
      })) || []
    )
  }

  return []
}

const WorkBookCover = ({
  title,
  level,
}: {
  title: string
  level?: string
}) => {
  const numberStr = title.includes("Beginner")
    ? "1"
    : title.includes("Intermediate")
      ? "2"
      : title.includes("Advanced")
        ? "3"
        : "K"

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#18181b] via-[#09090b] to-[#000000] border border-zinc-700/60 flex flex-col items-center justify-between p-4 relative overflow-hidden text-zinc-100 select-none shadow-inner">
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

      {/* Top spine / header */}
      <div className="w-full flex items-center justify-between border-b border-zinc-700/60 pb-2 z-10">
        <span className="text-[10px] tracking-widest uppercase font-extrabold text-zinc-300">
          Native English
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold uppercase tracking-wider">
          B&amp;W Activities
        </span>
      </div>

      {/* Center Leaf & Title */}
      <div className="my-auto text-center flex flex-col items-center py-2 z-10 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 border border-zinc-600 flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-zinc-100" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            {level ? `${level} Level` : "Grammar Companion"}
          </p>
          <h4 className="text-lg font-black text-white tracking-tight uppercase">
            Work Book
          </h4>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
            Same Chapters • Activities Only
          </p>
        </div>
      </div>

      {/* Bottom big volume number */}
      <div className="w-full flex items-end justify-between border-t border-zinc-800 pt-2 z-10">
        <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">
          Vol. {numberStr}
        </span>
        <span className="text-3xl font-black text-zinc-100 tracking-tighter">
          {numberStr}
        </span>
      </div>
    </div>
  )
}

const StudentMaterials = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get("category") || "Grammar"

  const [materials, setMaterials] = useState<Material[]>([])
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [activeSubCategory, setActiveSubCategory] = useState<"Reading" | "Listening">("Reading")
  const [activeClubSubCategory, setActiveClubSubCategory] = useState<"Reading" | "Listening">("Reading")
  const [loading, setLoading] = useState(true)

  // Sync state if URL query param changes
  useEffect(() => {
    const cat = searchParams.get("category")
    if (
      cat &&
      (cat === "Grammar" ||
        cat === "Workbook" ||
        cat === "Entertainment" ||
        cat === "Club")
    ) {
      setActiveCategory(cat)
    }
  }, [searchParams])

  const handleSelectCategory = (catKey: string) => {
    setActiveCategory(catKey)
    setSearchParams({ category: catKey })
  }

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

  // Filter materials based on category
  const filtered = materials
    .filter((m) => {
      if (!m.category || m.target_audience?.toLowerCase() === "teacher")
        return false
      if (activeCategory === "Entertainment") {
        const targetCat = activeSubCategory
        return m.category.toLowerCase() === targetCat.toLowerCase()
      }
      if (activeCategory === "Club") {
        const targetCat = `Club (${activeClubSubCategory})`
        return m.category.toLowerCase() === targetCat.toLowerCase()
      }
      return m.category.toLowerCase() === activeCategory.toLowerCase()
    })
    .sort((a, b) => {
      const getLevelScore = (m: Material) => {
        const level = (m.level || "").toLowerCase()
        const title = (m.title || "").toLowerCase()

        if (level.includes("beginner") || title.includes("beginner")) return 1
        if (level.includes("intermediate") || title.includes("intermediate"))
          return 2
        if (title.includes("advanced (1)") || title.includes("advanced 1"))
          return 3
        if (title.includes("advanced (2)") || title.includes("advanced 2"))
          return 4
        if (level.includes("advanced") || title.includes("advanced")) return 3
        return 5
      }
      return getLevelScore(a) - getLevelScore(b)
    })

  // If Workbook category is chosen and DB has no items yet, use default curated workbooks
  const displayMaterials =
    activeCategory === "Workbook" && filtered.length === 0
      ? DEFAULT_WORKBOOKS
      : filtered

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
            onClick={() => handleSelectCategory(cat.key)}
            className="gap-1.5"
          >
            {cat.key === "Workbook" && <FileText className="w-4 h-4" />}
            {cat.key === "Grammar" && <BookOpen className="w-4 h-4" />}
            <span>{cat.label}</span>
          </Button>
        ))}
      </div>

      {/* Work Book Section Banner */}
      {activeCategory === "Workbook" && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
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
              Black and white companion editions to our Grammar Books with the
              exact same chapter structure, focused exclusively on exercises,
              drills, fill-in-the-blanks, and speaking activities.
            </p>
          </div>
        </div>
      )}

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

      {/* Materials Grid */}
      {displayMaterials.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No materials available in this category
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayMaterials.map((material) => {
            const chapters = getChaptersForMaterial(material)

            return (
              <Card
                key={material.id}
                className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full border-muted-foreground/20"
              >
                <div className="w-full aspect-video bg-muted relative shrink-0 overflow-hidden">
                  {activeCategory === "Workbook" && !material.thumbnail_url ? (
                    <WorkBookCover
                      title={material.title}
                      level={material.level}
                    />
                  ) : (
                    <img
                      src={getThumbnailSrc(
                        material.thumbnail_url || "",
                        material.url
                      )}
                      alt={material.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src =
                          "https://placehold.co/600x400/2a2a2a/ffffff?text=Material"
                      }}
                    />
                  )}
                </div>

                <CardContent className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-lg leading-tight line-clamp-1">
                      {material.title}
                    </h3>
                  </div>

                  {activeCategory === "Workbook" && (
                    <div className="mb-2">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        B&amp;W Activities • Same Chapter Structure
                      </span>
                    </div>
                  )}

                  {material.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-4 flex-1">
                      {material.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 pt-2">
                    {/* View Chapter Activities Button & Modal */}
                    {activeCategory === "Workbook" && chapters.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-zinc-700 hover:bg-zinc-800 text-xs font-semibold gap-1.5"
                          >
                            <ListChecks className="w-3.5 h-3.5" />
                            <span>View Chapters &amp; Activities</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                          <DialogHeader className="p-6 pb-4 border-b">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-700">
                                B&amp;W Activities Edition
                              </span>
                            </div>
                            <DialogTitle className="text-xl font-bold flex items-center justify-between">
                              <span>{material.title}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground pt-1">
                              Follows the exact same chapter structure as the
                              Grammar Book, with activities and exercises only.
                            </DialogDescription>
                          </DialogHeader>

                          <ScrollArea className="flex-1 p-6">
                            <div className="space-y-3">
                              {chapters.map((ch) => (
                                <div
                                  key={ch.chapterNumber}
                                  className="p-3.5 rounded-xl border border-muted-foreground/15 bg-muted/40 hover:bg-muted/70 transition-colors flex items-start gap-3"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 flex items-center justify-center font-black text-xs shrink-0">
                                    {ch.chapterNumber < 10
                                      ? `0${ch.chapterNumber}`
                                      : ch.chapterNumber}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <h5 className="font-bold text-sm text-foreground">
                                        Chapter {ch.chapterNumber}: {ch.title}
                                      </h5>
                                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Activities
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                      {ch.grammarFocus}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>

                          <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">
                              {chapters.length} Practice Chapters
                            </span>
                            <Button asChild size="sm" className="gap-1.5 shadow-sm">
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span>Open Full Work Book PDF</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button
                      asChild
                      variant={activeCategory === "Workbook" ? "secondary" : "default"}
                      className="w-full shadow-sm"
                    >
                      <a href={material.url} target="_blank" rel="noreferrer">
                        Open Material
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StudentMaterials
