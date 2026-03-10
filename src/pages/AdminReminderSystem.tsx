import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Edit, Bell, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  remind_at: string;
  target_sections: string[];
  created_by: string;
  created_at: string;
}

const AdminReminderSystem = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => { 
    fetchData(); 
  }, []);

  /* 🔔 REALTIME LISTENER ADDED HERE */
  useEffect(() => {
    const channel = supabase
      .channel('reminder-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
        },
        () => {
          fetchData(); // auto refresh reminders
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [remRes, secRes] = await Promise.all([
      supabase.from('reminders').select('*').order('remind_at', { ascending: true }),
      supabase.from('profiles').select('section').not('section', 'is', null),
    ]);

    if (remRes.data) setReminders(remRes.data as Reminder[]);

    if (secRes.data) {
      const unique = [...new Set(secRes.data.map(p => p.section).filter(Boolean))] as string[];
      setSections(unique.sort());
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !remindAt || !user) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      remind_at: new Date(remindAt).toISOString(),
      target_sections: selectedSections,
      created_by: user.id,
    };

    let error;

    if (editingReminder) {
      ({ error } = await supabase.from('reminders').update(payload).eq('id', editingReminder.id));
    } else {
      ({ error } = await supabase.from('reminders').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingReminder ? 'Reminder updated' : 'Reminder created' });
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (!error) { 
      toast({ title: 'Reminder deleted' }); 
      fetchData(); 
    }
  };

  const openEdit = (r: Reminder) => {
    setEditingReminder(r);
    setTitle(r.title);
    setDescription(r.description || '');
    setRemindAt(format(new Date(r.remind_at), "yyyy-MM-dd'T'HH:mm"));
    setSelectedSections(r.target_sections || []);
    setDialogOpen(true);
  };

  const resetForm = () => { 
    setTitle(''); 
    setDescription(''); 
    setRemindAt(''); 
    setSelectedSections([]); 
    setEditingReminder(null); 
  };

  const toggleSection = (s: string) =>
    setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const isPast = (d: string) => new Date(d) < new Date();

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Reminder System</h1>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Reminder
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Create Reminder'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Quiz tomorrow" />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={3} />
                </div>

                <div>
                  <label className="text-sm font-medium">Remind At *</label>
                  <Input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} />
                </div>

                <div>
                  <label className="text-sm font-medium">Target Sections</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sections.map(s => (
                      <Badge
                        key={s}
                        variant={selectedSections.includes(s) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleSection(s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={!title.trim() || !remindAt || selectedSections.length === 0}
                >
                  {editingReminder ? 'Update' : 'Create'} Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No reminders yet.</p>
          </div>
        ) : reminders.map(r => (
          <Card key={r.id} className={isPast(r.remind_at) ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Bell className={`h-4 w-4 ${isPast(r.remind_at) ? 'text-muted-foreground' : 'text-amber-500'}`} />
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  {isPast(r.remind_at) && <Badge variant="secondary" className="text-xs">Past</Badge>}
                </div>

                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReminder(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-2">
              {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}

              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                {format(new Date(r.remind_at), 'MMM d, yyyy h:mm a')}
              </div>

              {r.target_sections?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.target_sections.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminReminderSystem;