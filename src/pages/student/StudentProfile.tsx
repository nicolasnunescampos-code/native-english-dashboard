import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"

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
    const { user } = useAuth()
    const [profile, setProfile] = useState<StudentProfileData | null>(null)
    const [loading, setLoading] = useState(true)

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
                        <h3 className="text-2xl font-semibold">{profile.student_name}</h3>
                        <p className="text-muted-foreground mt-1">{profile.email}</p>

                        <div className="mt-4">
                            <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${profile.rules_agreed
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}
                            >
                                {profile.rules_agreed ? 'Rules: Agreed ✅' : 'Rules: Pending ⏳'}
                            </span>
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
        </div>
    )
}

export default StudentProfile
