import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "react-router-dom"
import { BellRing, FileText, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar, AvatarUploadDialog } from "@/components/AvatarUploadModal"
import { NotificationIncentiveBanner } from "@/components/notifications/NotificationIncentiveBanner"

interface StudentProfileData {
    id: string
    student_name: string
    email: string
    classes_per_week: number
    cpf?: string | null
    payment_amount?: string | null
    currency?: string | null
    rules_agreed?: boolean
}

const StudentProfile: React.FC = () => {
    const { user, avatarUrl } = useAuth()
    const [profile, setProfile] = useState<StudentProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [avatarOpen, setAvatarOpen] = useState(false)

    useEffect(() => {
        if (!user?.email) {
            setLoading(false)
            return
        }

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from("students")
                    .select("*")
                    .ilike("email", user.email!)
                    .maybeSingle()

                if (error) {
                    console.error("Error fetching profile:", error)
                } else if (data) {
                    setProfile(data)
                }
            } catch (err) {
                console.error("Failed to fetch student profile", err)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [user?.email])

    if (loading) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
                <Card className="animate-pulse">
                    <CardContent className="h-40 bg-muted/50 rounded-xl" />
                </Card>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        Profile not found. Please contact an administrator.
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight">Profile</h2>

            <Card>
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="border-b pb-6">
                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setAvatarOpen(true)}
                                className="relative group cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400"
                                title="Change profile picture"
                            >
                                <UserAvatar
                                    src={avatarUrl}
                                    initials={profile.student_name.slice(0, 2).toUpperCase()}
                                    alt={profile.student_name}
                                    className="w-16 h-16 rounded-full"
                                    textClassName="text-lg"
                                />
                                <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Camera className="w-5 h-5" />
                                </span>
                            </button>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-2xl font-semibold">{profile.student_name}</h3>
                                <p className="text-muted-foreground mt-0.5">{profile.email}</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAvatarOpen(true)}
                                className="gap-1.5 rounded-xl"
                            >
                                <Camera className="w-4 h-4" />
                                {avatarUrl ? 'Change Photo' : 'Add Photo'}
                            </Button>
                        </div>

                        <AvatarUploadDialog
                            open={avatarOpen}
                            onOpenChange={setAvatarOpen}
                            initials={profile.student_name.slice(0, 2).toUpperCase()}
                            displayName={profile.student_name}
                        />

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${profile.rules_agreed
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}
                            >
                                {profile.rules_agreed ? 'Rules: Agreed ✅' : 'Rules: Pending ⏳'}
                            </span>

                            <Link
                                to="/student/rules"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                            >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                {profile.rules_agreed ? 'Ver / Baixar Contrato (PDF)' : 'Assinar Contrato'}
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">📚</span>
                            <span className="text-lg">{profile.classes_per_week} classes/week</span>
                        </div>

                        {profile.cpf && (
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-purple-600 dark:text-purple-400 font-bold bg-purple-100 dark:bg-purple-900/30 rounded px-1 text-sm border border-purple-200 dark:border-purple-800">
                                    ID
                                </span>
                                <span className="text-lg">CPF: {profile.cpf}</span>
                            </div>
                        )}

                        {profile.payment_amount && (
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-green-700 dark:text-green-500 font-bold bg-green-100 dark:bg-green-900/30 rounded px-1.5 text-sm border border-green-200 dark:border-green-800">
                                    💳
                                </span>
                                <span className="text-lg font-medium text-green-700 dark:text-green-500">
                                    {profile.currency || 'BRL'} {profile.payment_amount}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
                <CardContent className="p-6 md:p-8 space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-primary" />
                            Notificações no Celular & PWA
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Gerencie e teste seus alertas de novas aulas e mensagens de professores.
                        </p>
                    </div>
                    <NotificationIncentiveBanner />
                </CardContent>
            </Card>
        </div>
    )
}

export default StudentProfile
