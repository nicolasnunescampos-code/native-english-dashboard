import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface Recuperation {
  id: string
  student_id: string
  status: 'pending' | 'completed' | 'cancelled'
  date: string
}

const StudentRecuperations: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [recuperations, setRecuperations] = useState<Recuperation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadRecuperations = async () => {
      try {
        const { data, error } = await supabase
          .from('recuperation_classes')
          .select('id, student_id, status, date') // Excluded notes from student view as they might be internal admin details
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setRecuperations(data || [])
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    loadRecuperations()
  }, [user, toast])

  const pendingCount = recuperations.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl text-center">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">Available Recuperations</h2>
        <div className="text-4xl font-bold text-blue-600">{pendingCount}</div>
        <p className="text-sm text-blue-700 mt-2">Classes available to reschedule</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-lg">Your Recuperation History</h3>
        
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : recuperations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              You do not have any recuperation classes available right now.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recuperations
              .sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return -1;
                if (a.status !== 'completed' && b.status === 'completed') return 1;
                return 0;
              })
              .map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Class Recuperation</p>
                    <p className="text-sm text-muted-foreground">{r.date ? `Scheduled for: ${r.date}` : "Date: TBD"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    r.status === 'completed' ? 'bg-green-100 text-green-700' :
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {r.status.toUpperCase()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentRecuperations
