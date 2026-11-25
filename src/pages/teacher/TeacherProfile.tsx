import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { BellRing, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar, AvatarUploadDialog } from "@/components/AvatarUploadModal"
import { NotificationIncentiveBanner } from "@/components/notifications/NotificationIncentiveBanner"

interface TeacherProfileData {
    id: string
    name: string
    class_rate?: number
    color?: string
    meet_link?: string
}

const TeacherProfile: React.FC = () => {
    const { user, teacherName, avatarUrl } = useAuth()
    const [profile, setProfile] = useState<TeacherProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [avatarOpen, setAvatarOpen] = useState(false)

    useEffect(() => {
        if (!teacherName) {
            setLoading(false)
            return
        }

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from("teachers")
                    .select("*")
                    .ilike("name", teacherName)
                    .maybeSingle()

                if (error) {
                    console.error("Error fetching profile:", error)
                } else if (data) {
                    setProfile(data)
                }
            } catch (err) {
                console.error("Failed to fetch teacher profile", err)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [teacherName])

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
                    <div className="border-b pb-6 flex items-center gap-4 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setAvatarOpen(true)}
                            className="relative group cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400"
                            title="Change profile picture"
                        >
                            {avatarUrl ? (
                                <UserAvatar
                                    src={avatarUrl}
                                    initials={profile.name.slice(0, 2).toUpperCase()}
                                    alt={profile.name}
                                    className="w-16 h-16 rounded-full shadow-sm"
                                />
                            ) : profile.color ? (
                                <div
                                    className="w-16 h-16 rounded-full shrink-0 shadow-sm flex items-center justify-center text-white font-bold text-lg"
                                    style={{ backgroundColor: profile.color }}
                                >
                                    {profile.name.slice(0, 2).toUpperCase()}
                                </div>
                            ) : (
                                <UserAvatar
                                    src={null}
                                    initials={profile.name.slice(0, 2).toUpperCase()}
                                    alt={profile.name}
                                    className="w-16 h-16 rounded-full shadow-sm"
                                    textClassName="text-lg"
                                />
                            )}
                            <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Camera className="w-5 h-5" />
                            </span>
                        </button>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-semibold">{profile.name}</h3>
                            <p className="text-muted-foreground mt-1">{user?.email}</p>
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
                        initials={profile.name.slice(0, 2).toUpperCase()}
                        displayName={profile.name}
                    />

                    <div className="space-y-4">
                        {profile.class_rate !== undefined && profile.class_rate !== null && (
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-green-700 dark:text-green-500 font-bold bg-green-100 dark:bg-green-900/30 rounded px-1.5 py-0.5 text-sm border border-green-200 dark:border-green-800">
                                    💳
                                </span>
                                <span className="text-lg font-medium text-green-700 dark:text-green-500">
                                    Rate per class: R${profile.class_rate.toFixed(2)}
                                </span>
                            </div>
                        )}

                        {profile.meet_link && (
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-blue-700 dark:text-blue-500 font-bold bg-blue-100 dark:bg-blue-900/30 rounded px-1.5 py-0.5 text-sm border border-blue-200 dark:border-blue-800">
                                    🎥
                                </span>
                                <a 
                                    href={profile.meet_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-lg text-blue-600 hover:underline break-all"
                                >
                                    {profile.meet_link}
                                </a>
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
                            Notificações no Celular & Computador
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Receba alertas sonoros quando alunos enviarem mensagens ou novas aulas entrarem na sua grade.
                        </p>
                    </div>
                    <NotificationIncentiveBanner />
                </CardContent>
            </Card>
        </div>
    )
}

export default TeacherProfile
