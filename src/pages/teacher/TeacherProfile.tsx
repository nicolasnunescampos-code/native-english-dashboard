import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"

interface TeacherProfileData {
    id: string
    name: string
    class_rate?: number
    color?: string
    meet_link?: string
}

const TeacherProfile: React.FC = () => {
    const { user, teacherName } = useAuth()
    const [profile, setProfile] = useState<TeacherProfileData | null>(null)
    const [loading, setLoading] = useState(true)

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
                    <div className="border-b pb-6 flex items-center gap-4">
                        {profile.color && (
                            <div 
                                className="w-16 h-16 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: profile.color }}
                            />
                        )}
                        <div>
                            <h3 className="text-2xl font-semibold">{profile.name}</h3>
                            <p className="text-muted-foreground mt-1">{user?.email}</p>
                        </div>
                    </div>

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
        </div>
    )
}

export default TeacherProfile
