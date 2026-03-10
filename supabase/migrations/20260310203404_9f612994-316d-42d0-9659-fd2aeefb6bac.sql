
-- 1. Classroom Tasks
CREATE TABLE public.classroom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  assigned_sections text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.classroom_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tasks" ON public.classroom_tasks FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view assigned tasks" ON public.classroom_tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND section = ANY(classroom_tasks.assigned_sections))
);

-- Student task completions
CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.classroom_tasks(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own completions" ON public.task_completions FOR ALL TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can view all completions" ON public.task_completions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 2. Reminders
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  remind_at timestamp with time zone NOT NULL,
  target_sections text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reminders" ON public.reminders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view their reminders" ON public.reminders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND section = ANY(reminders.target_sections))
);

-- 3. Participation Tracker
CREATE TABLE public.participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  section text NOT NULL,
  points integer DEFAULT 1,
  recorded_by uuid NOT NULL,
  recorded_at timestamp with time zone DEFAULT now(),
  note text
);

ALTER TABLE public.participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage participation" ON public.participation FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view own participation" ON public.participation FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- 4. Group Activities
CREATE TABLE public.group_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  section text NOT NULL,
  groups jsonb NOT NULL DEFAULT '[]',
  num_groups integer DEFAULT 2,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.group_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group activities" ON public.group_activities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view their group activities" ON public.group_activities FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND section = group_activities.section)
);

-- 5. Lesson Materials
CREATE TABLE public.lesson_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  assigned_sections text[] DEFAULT '{}',
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage materials" ON public.lesson_materials FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view assigned materials" ON public.lesson_materials FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND section = ANY(lesson_materials.assigned_sections))
);

-- 6. Substitute Teacher Plans
CREATE TABLE public.substitute_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  instructions text NOT NULL,
  activities text,
  section text NOT NULL,
  is_active boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.substitute_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage substitute plans" ON public.substitute_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view active plans for their section" ON public.substitute_plans FOR SELECT TO authenticated USING (
  is_active AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND section = substitute_plans.section)
);

-- Storage bucket for lesson materials
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-materials', 'lesson-materials', true);

-- Storage policies for lesson materials
CREATE POLICY "Admins can upload lesson materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-materials' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view lesson materials" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lesson-materials');
CREATE POLICY "Admins can delete lesson materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lesson-materials' AND has_role(auth.uid(), 'admin'));
