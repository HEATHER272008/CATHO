import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface StudentData {
  user_id: string;
  name: string;
  section: string | null;
  attendanceCount: number;
  lateCount: number;
  absentCount: number;
  participationPoints: number;
  totalDays: number;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

const AdminPerformanceAnalytics = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, attendanceRes, participationRes] = await Promise.all([
      supabase.from('profiles').select('user_id, name, section').not('section', 'is', null),
      supabase.from('attendance').select('student_id, status'),
      supabase.from('participation').select('student_id, points'),
    ]);

    const profiles = profilesRes.data || [];
    const attendance = attendanceRes.data || [];
    const participation = participationRes.data || [];

    const unique = [...new Set(profiles.map(p => p.section).filter(Boolean))] as string[];
    setSections(unique.sort());

    const data: StudentData[] = profiles.map(p => {
      const studentAtt = attendance.filter(a => a.student_id === p.user_id);
      const studentPart = participation.filter(pp => pp.student_id === p.user_id);
      return {
        user_id: p.user_id,
        name: p.name,
        section: p.section,
        attendanceCount: studentAtt.filter(a => a.status === 'present').length,
        lateCount: studentAtt.filter(a => a.status === 'late').length,
        absentCount: studentAtt.filter(a => a.status === 'absent').length,
        participationPoints: studentPart.reduce((s, pp) => s + (pp.points || 1), 0),
        totalDays: studentAtt.length,
      };
    });

    setStudentData(data);
    setLoading(false);
  };

  const filtered = selectedSection === 'all' ? studentData : studentData.filter(s => s.section === selectedSection);
  const topPerformers = [...filtered].sort((a, b) => (b.attendanceCount + b.participationPoints) - (a.attendanceCount + a.participationPoints)).slice(0, 5);
  const struggling = [...filtered].sort((a, b) => (b.absentCount + b.lateCount) - (a.absentCount + a.lateCount)).slice(0, 5);

  const overallStats = {
    totalPresent: filtered.reduce((s, d) => s + d.attendanceCount, 0),
    totalLate: filtered.reduce((s, d) => s + d.lateCount, 0),
    totalAbsent: filtered.reduce((s, d) => s + d.absentCount, 0),
    totalParticipation: filtered.reduce((s, d) => s + d.participationPoints, 0),
  };

  const pieData = [
    { name: 'Present', value: overallStats.totalPresent },
    { name: 'Late', value: overallStats.totalLate },
    { name: 'Absent', value: overallStats.totalAbsent },
  ].filter(d => d.value > 0);

  const barData = topPerformers.map(s => ({ name: s.name.split(' ')[0], attendance: s.attendanceCount, participation: s.participationPoints }));

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => selectedStudent ? setSelectedStudent(null) : navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">{selectedStudent ? selectedStudent.name : 'Performance Analytics'}</h1>
          </div>
          {!selectedStudent && (
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? <p className="text-center text-muted-foreground py-8">Loading analytics...</p> : selectedStudent ? (
          // Individual Student View
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{selectedStudent.attendanceCount}</p><p className="text-xs text-muted-foreground">Present</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{selectedStudent.lateCount}</p><p className="text-xs text-muted-foreground">Late</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{selectedStudent.absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{selectedStudent.participationPoints}</p><p className="text-xs text-muted-foreground">Participation</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Attendance Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-4">
                  <div className="bg-green-500 h-4 rounded-full" style={{ width: `${selectedStudent.totalDays > 0 ? (selectedStudent.attendanceCount / selectedStudent.totalDays * 100) : 0}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selectedStudent.totalDays > 0 ? Math.round(selectedStudent.attendanceCount / selectedStudent.totalDays * 100) : 0}% attendance rate</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Overview
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{overallStats.totalPresent}</p><p className="text-xs text-muted-foreground">Total Present</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{overallStats.totalParticipation}</p><p className="text-xs text-muted-foreground">Participation Pts</p></CardContent></Card>
            </div>

            {pieData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Attendance Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {barData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Top Performers</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="attendance" fill="#22c55e" name="Attendance" /><Bar dataKey="participation" fill="#3b82f6" name="Participation" /></BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> High Performers</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {topPerformers.map(s => (
                  <button key={s.user_id} onClick={() => setSelectedStudent(s)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{s.name}</span><Badge variant="secondary" className="text-xs">{s.section}</Badge></div>
                    <span className="text-xs text-green-600">{s.attendanceCount} present</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Need Attention</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {struggling.filter(s => s.absentCount + s.lateCount > 0).map(s => (
                  <button key={s.user_id} onClick={() => setSelectedStudent(s)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{s.name}</span><Badge variant="secondary" className="text-xs">{s.section}</Badge></div>
                    <span className="text-xs text-red-600">{s.absentCount} absent, {s.lateCount} late</span>
                  </button>
                ))}
                {struggling.filter(s => s.absentCount + s.lateCount > 0).length === 0 && <p className="text-sm text-muted-foreground">No students flagged</p>}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminPerformanceAnalytics;
