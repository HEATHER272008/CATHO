import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Shuffle, Users, Save, Trash2 } from 'lucide-react';

interface GroupActivity {
  id: string;
  title: string;
  section: string;
  groups: { name: string; members: string[] }[];
  num_groups: number;
  created_at: string;
}

const AdminGroupOrganizer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [students, setStudents] = useState<{ name: string; section: string | null }[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [numGroups, setNumGroups] = useState(2);
  const [activityTitle, setActivityTitle] = useState('');
  const [generatedGroups, setGeneratedGroups] = useState<{ name: string; members: string[] }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [studRes, actRes] = await Promise.all([
      supabase.from('profiles').select('name, section').not('section', 'is', null),
      supabase.from('group_activities').select('*').order('created_at', { ascending: false }),
    ]);
    if (studRes.data) {
      setStudents(studRes.data);
      const unique = [...new Set(studRes.data.map(s => s.section).filter(Boolean))] as string[];
      setSections(unique.sort());
    }
    if (actRes.data) setActivities(actRes.data.map(a => ({ ...a, groups: (a.groups as any) || [] })) as GroupActivity[]);
    setLoading(false);
  };

  const generateGroups = () => {
    if (!selectedSection) return;
    const sectionStudents = students.filter(s => s.section === selectedSection).map(s => s.name);
    const shuffled = [...sectionStudents].sort(() => Math.random() - 0.5);
    const groups: { name: string; members: string[] }[] = [];
    for (let i = 0; i < numGroups; i++) groups.push({ name: `Group ${i + 1}`, members: [] });
    shuffled.forEach((s, i) => groups[i % numGroups].members.push(s));
    setGeneratedGroups(groups);
  };

  const saveActivity = async () => {
    if (!activityTitle.trim() || !selectedSection || !user || generatedGroups.length === 0) return;
    const { error } = await supabase.from('group_activities').insert({
      title: activityTitle.trim(),
      section: selectedSection,
      groups: generatedGroups as any,
      num_groups: numGroups,
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Groups saved!' });
      setDialogOpen(false);
      setGeneratedGroups([]);
      setActivityTitle('');
      fetchData();
    }
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase.from('group_activities').delete().eq('id', id);
    if (!error) { toast({ title: 'Activity deleted' }); fetchData(); }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-foreground">Group Organizer</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Shuffle className="h-4 w-4 mr-1" /> Generate</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Generate Groups</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><label className="text-sm font-medium">Activity Title *</label><Input value={activityTitle} onChange={e => setActivityTitle(e.target.value)} placeholder="e.g. Science Project" /></div>
                <div>
                  <label className="text-sm font-medium">Section *</label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Number of Groups</label>
                  <Input type="number" min={2} max={20} value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value) || 2)} />
                </div>
                <Button onClick={generateGroups} variant="outline" className="w-full"><Shuffle className="h-4 w-4 mr-1" /> Randomize</Button>

                {generatedGroups.length > 0 && (
                  <div className="space-y-3">
                    {generatedGroups.map((g, i) => (
                      <Card key={i}>
                        <CardHeader className="py-2 px-3"><CardTitle className="text-sm">{g.name}</CardTitle></CardHeader>
                        <CardContent className="px-3 pb-2">
                          <div className="flex flex-wrap gap-1">{g.members.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}</div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button onClick={saveActivity} className="w-full" disabled={!activityTitle.trim()}>
                      <Save className="h-4 w-4 mr-1" /> Save Groups
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> : activities.length === 0 ? (
          <div className="text-center py-12"><Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No group activities yet.</p></div>
        ) : activities.map(act => (
          <Card key={act.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{act.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{act.section} · {act.num_groups} groups</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteActivity(act.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {act.groups.map((g, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-2">
                  <p className="text-xs font-semibold mb-1">{g.name}</p>
                  <div className="flex flex-wrap gap-1">{g.members.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminGroupOrganizer;
