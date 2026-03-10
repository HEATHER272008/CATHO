import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Edit, BookOpen, CheckCircle } from 'lucide-react';

interface SubPlan {
  id: string;
  title: string;
  instructions: string;
  activities: string | null;
  section: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

const AdminSubstituteTeacher = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubPlan | null>(null);

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [activities, setActivities] = useState('');
  const [section, setSection] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [planRes, secRes] = await Promise.all([
      supabase.from('substitute_plans').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('section').not('section', 'is', null),
    ]);
    if (planRes.data) setPlans(planRes.data as SubPlan[]);
    if (secRes.data) {
      const unique = [...new Set(secRes.data.map(p => p.section).filter(Boolean))] as string[];
      setSections(unique.sort());
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !instructions.trim() || !section || !user) return;
    const payload = {
      title: title.trim(),
      instructions: instructions.trim(),
      activities: activities.trim() || null,
      section,
      created_by: user.id,
    };

    let error;
    if (editingPlan) {
      ({ error } = await supabase.from('substitute_plans').update(payload).eq('id', editingPlan.id));
    } else {
      ({ error } = await supabase.from('substitute_plans').insert(payload));
    }
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingPlan ? 'Plan updated' : 'Plan created' });
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const toggleActive = async (plan: SubPlan) => {
    const { error } = await supabase.from('substitute_plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    if (!error) fetchData();
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('substitute_plans').delete().eq('id', id);
    if (!error) { toast({ title: 'Plan deleted' }); fetchData(); }
  };

  const openEdit = (p: SubPlan) => {
    setEditingPlan(p);
    setTitle(p.title);
    setInstructions(p.instructions);
    setActivities(p.activities || '');
    setSection(p.section);
    setDialogOpen(true);
  };

  const resetForm = () => { setTitle(''); setInstructions(''); setActivities(''); setSection(''); setEditingPlan(null); };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-foreground">Substitute Teacher</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Lesson Plan'}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><label className="text-sm font-medium">Title *</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lesson plan title" /></div>
                <div>
                  <label className="text-sm font-medium">Section *</label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Instructions *</label><Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Detailed instructions for the substitute..." rows={4} /></div>
                <div><label className="text-sm font-medium">Activities</label><Textarea value={activities} onChange={e => setActivities(e.target.value)} placeholder="Activities for the class..." rows={3} /></div>
                <Button onClick={handleSubmit} className="w-full" disabled={!title.trim() || !instructions.trim() || !section}>
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> : plans.length === 0 ? (
          <div className="text-center py-12"><BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No substitute plans yet.</p></div>
        ) : plans.map(plan => (
          <Card key={plan.id} className={plan.is_active ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    {plan.is_active && <Badge className="bg-green-500 text-xs">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.section}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={plan.is_active} onCheckedChange={() => toggleActive(plan)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePlan(plan.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Instructions</p>
                <p className="text-sm whitespace-pre-wrap">{plan.instructions}</p>
              </div>
              {plan.activities && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Activities</p>
                  <p className="text-sm whitespace-pre-wrap">{plan.activities}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminSubstituteTeacher;
