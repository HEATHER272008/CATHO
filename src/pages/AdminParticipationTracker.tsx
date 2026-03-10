import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Hand, RotateCcw, Trophy, Plus } from 'lucide-react';

interface StudentProfile {
  user_id: string;
  name: string;
  section: string | null;
}

interface ParticipationRecord {
  id: string;
  student_id: string;
  student_name: string;
  section: string;
  points: number;
  recorded_at: string;
}

const AdminParticipationTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [participation, setParticipation] = useState<ParticipationRecord[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [studRes, partRes] = await Promise.all([
      supabase.from('profiles').select('user_id, name, section').not('section', 'is', null),
      supabase.from('participation').select('*').order('recorded_at', { ascending: false }),
    ]);
    if (studRes.data) {
      setStudents(studRes.data);
      const unique = [...new Set(studRes.data.map(s => s.section).filter(Boolean))] as string[];
      setSections(unique.sort());
      if (unique.length > 0 && !selectedSection) setSelectedSection(unique[0]);
    }
    if (partRes.data) setParticipation(partRes.data as ParticipationRecord[]);
    setLoading(false);
  };

  const getStudentPoints = (studentId: string) => {
    return participation.filter(p => p.student_id === studentId).reduce((sum, p) => sum + (p.points || 1), 0);
  };

  const addParticipation = async (student: StudentProfile) => {
    if (!user) return;
    const { error } = await supabase.from('participation').insert({
      student_id: student.user_id,
      student_name: student.name,
      section: student.section || '',
      points: 1,
      recorded_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `+1 point for ${student.name}` });
      fetchData();
    }
  };

  const resetStudentParticipation = async (studentId: string) => {
    const { error } = await supabase.from('participation').delete().eq('student_id', studentId);
    if (!error) { toast({ title: 'Participation reset' }); fetchData(); }
  };

  const filteredStudents = students.filter(s => s.section === selectedSection);
  const rankedStudents = [...filteredStudents].sort((a, b) => getStudentPoints(b.user_id) - getStudentPoints(a.user_id));

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-foreground">Participation Tracker</h1>
          </div>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </header>

      <main className="px-4 py-4 space-y-3">
        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> : rankedStudents.length === 0 ? (
          <div className="text-center py-12"><Hand className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No students in this section.</p></div>
        ) : rankedStudents.map((student, idx) => {
          const pts = getStudentPoints(student.user_id);
          return (
            <Card key={student.user_id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                    {idx < 3 ? <Trophy className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{pts} point{pts !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => addParticipation(student)}>
                    <Plus className="h-3 w-3 mr-1" /> +1
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => resetStudentParticipation(student.user_id)}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
};

export default AdminParticipationTracker;
