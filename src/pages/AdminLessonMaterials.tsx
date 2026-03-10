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
import { ArrowLeft, Plus, Trash2, FileText, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  assigned_sections: string[];
  uploaded_by: string;
  created_at: string;
}

const AdminLessonMaterials = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [matRes, secRes] = await Promise.all([
      supabase.from('lesson_materials').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('section').not('section', 'is', null),
    ]);
    if (matRes.data) setMaterials(matRes.data as Material[]);
    if (secRes.data) {
      const unique = [...new Set(secRes.data.map(p => p.section).filter(Boolean))] as string[];
      setSections(unique.sort());
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!title.trim() || !file || !user) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('lesson-materials').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('lesson-materials').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('lesson_materials').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        assigned_sections: selectedSections,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      toast({ title: 'Material uploaded!' });
      setTitle(''); setDescription(''); setFile(null); setSelectedSections([]);
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterial = async (mat: Material) => {
    // Extract path from URL
    const urlParts = mat.file_url.split('/lesson-materials/');
    if (urlParts[1]) {
      await supabase.storage.from('lesson-materials').remove([urlParts[1]]);
    }
    const { error } = await supabase.from('lesson_materials').delete().eq('id', mat.id);
    if (!error) { toast({ title: 'Material deleted' }); fetchData(); }
  };

  const toggleSection = (s: string) => setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const getFileIcon = (type: string | null) => {
    if (!type) return '📄';
    if (type.includes('pdf')) return '📕';
    if (type.includes('presentation') || type.includes('ppt')) return '📊';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('image')) return '🖼️';
    return '📄';
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-foreground">Lesson Materials</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Upload Material</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><label className="text-sm font-medium">Title *</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Material title" /></div>
                <div><label className="text-sm font-medium">Description</label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions..." rows={3} /></div>
                <div>
                  <label className="text-sm font-medium">File *</label>
                  <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.png,.jpeg" />
                </div>
                <div>
                  <label className="text-sm font-medium">Assign to Sections</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sections.map(s => (<Badge key={s} variant={selectedSections.includes(s) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleSection(s)}>{s}</Badge>))}
                  </div>
                </div>
                <Button onClick={handleUpload} className="w-full" disabled={!title.trim() || !file || uploading}>
                  {uploading ? 'Uploading...' : 'Upload Material'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> : materials.length === 0 ? (
          <div className="text-center py-12"><FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No materials uploaded yet.</p></div>
        ) : materials.map(mat => (
          <Card key={mat.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getFileIcon(mat.file_type)}</span>
                  <div>
                    <CardTitle className="text-base">{mat.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{mat.file_name}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(mat.file_url, '_blank')}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMaterial(mat)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {mat.description && <p className="text-sm text-muted-foreground">{mat.description}</p>}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">{mat.assigned_sections?.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                <span className="text-xs text-muted-foreground">{format(new Date(mat.created_at), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminLessonMaterials;
