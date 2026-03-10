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
import { ArrowLeft, Plus, Trash2, Edit, Calendar, CheckCircle2, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  assigned_sections: string[];
  created_by: string;
  created_at: string;
}

interface TaskCompletion {
  id: string;
  task_id: string;
  student_id: string;
  completed_at: string;
}

const AdminTaskManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [tasksRes, sectionsRes, completionsRes] = await Promise.all([
      supabase.from('classroom_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('section').not('section', 'is', null),
      supabase.from('task_completions').select('*'),
    ]);

    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    if (completionsRes.data) setCompletions(completionsRes.data as TaskCompletion[]);
    if (sectionsRes.data) {
      const unique = [...new Set(sectionsRes.data.map(p => p.section).filter(Boolean))] as string[];
      setSections(unique.sort());
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assigned_sections: selectedSections,
      created_by: user.id,
    };

    let error;
    if (editingTask) {
      ({ error } = await supabase.from('classroom_tasks').update(payload).eq('id', editingTask.id));
    } else {
      ({ error } = await supabase.from('classroom_tasks').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingTask ? 'Task updated' : 'Task created' });
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('classroom_tasks').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Task deleted' });
      fetchData();
    }
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '');
    setSelectedSections(task.assigned_sections || []);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setSelectedSections([]);
    setEditingTask(null);
  };

  const toggleSection = (s: string) => {
    setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const getCompletionCount = (taskId: string) => completions.filter(c => c.task_id === taskId).length;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Classroom Task Manager</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions and details" rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Assign to Sections</label>
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
                    {sections.length === 0 && <p className="text-sm text-muted-foreground">No sections found</p>}
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={!title.trim()}>
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
          </div>
        ) : (
          tasks.map(task => (
            <Card key={task.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {getCompletionCount(task.id)} completed
                  </div>
                </div>
                {task.assigned_sections && task.assigned_sections.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {task.assigned_sections.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default AdminTaskManager;
