import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Circle, Clock3, Edit3, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { generateStudyPlan } from '@/lib/ai-client';
import { isAIEnabled } from '@/lib/ai-client';
import { supabase, type LearningTask } from '@/lib/supabase';
import type { GeneratedStudyPlan } from '@/lib/types';
import { userError } from '@/lib/error-text';

const emptyForm = {
  title: '',
  description: '',
  subject: '',
  task_type: 'assignment' as LearningTask['task_type'],
  due_date: new Date().toISOString().slice(0, 10),
  estimated_hours: '',
};

export function LearningPlanner({ hasAnalyzedMaterial }: { hasAnalyzedMaterial: boolean }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<GeneratedStudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: requestError } = await supabase
      .from('learning_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    if (requestError) setError(userError(requestError, 'Der Lernkalender konnte nicht geladen werden – bitte versuch es gleich nochmal.'));
    setTasks((data as LearningTask[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadTasks();
    void isAIEnabled().then(setAiConfigured);
  }, [user]);

  const groupedTasks = useMemo(() => tasks.reduce<Record<string, LearningTask[]>>((groups, task) => {
    (groups[task.due_date] ||= []).push(task);
    return groups;
  }, {}), [tasks]);
  const hasOpenTasks = tasks.some((task) => !task.completed);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !form.title.trim() || !form.due_date) return;
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subject.trim() || 'Allgemein',
      task_type: form.task_type,
      due_date: form.due_date,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from('learning_tasks').update(payload).eq('id', editingId).eq('user_id', user.id)
      : await supabase.from('learning_tasks').insert({ ...payload, user_id: user.id });
    if (result.error) setError(userError(result.error, 'Die Aufgabe konnte nicht gespeichert werden – bitte versuch es gleich nochmal.'));
    else { resetForm(); await loadTasks(); }
    setSaving(false);
  };

  const editTask = (task: LearningTask) => {
    setEditingId(task.id);
    setShowForm(true);
    setForm({
      title: task.title,
      description: task.description,
      subject: task.subject,
      task_type: task.task_type,
      due_date: task.due_date,
      estimated_hours: task.estimated_hours?.toString() || '',
    });
  };

  const toggleTask = async (task: LearningTask) => {
    const { error: updateError } = await supabase.from('learning_tasks').update({ completed: !task.completed, updated_at: new Date().toISOString() }).eq('id', task.id).eq('user_id', user?.id);
    if (updateError) {
      setError(userError(updateError, 'Der Status konnte nicht gespeichert werden – bitte versuch es gleich nochmal.'));
      return;
    }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item));
  };

  const deleteTask = async (task: LearningTask) => {
    const { error: deleteError } = await supabase.from('learning_tasks').delete().eq('id', task.id).eq('user_id', user?.id);
    if (deleteError) {
      setError(userError(deleteError, 'Die Aufgabe wollte nicht verschwinden – bitte versuch es gleich nochmal.'));
      return;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
  };

  const createPlan = async () => {
    const openTasks = tasks.filter((task) => !task.completed);
    const missing: string[] = [];
    if (!openTasks.length) missing.push('bestätigte, offene Aufgaben oder Prüfungen');
    if (!hasAnalyzedMaterial) missing.push('analysiertes Lernmaterial');
    if (openTasks.some((task) => !task.due_date)) missing.push('Fristen bzw. einen Zeitraum');
    if (!aiConfigured) missing.push('eine aktive KI-Konfiguration');
    if (missing.length) {
      setError(`Fast geschafft – es fehlt noch: ${missing.join(', ')}.`);
      return;
    }
    setPlanning(true);
    setError(null);
    const result = await generateStudyPlan(
      'Erstelle meinen persönlichen Lernplan aus diesen offenen Aufgaben und Prüfungen. Plane konkrete, realistische Lerneinheiten bis zu den jeweiligen Fälligkeiten.',
      { tasks: openTasks },
      undefined,
      'Alle offenen Aufgaben rechtzeitig und mit kurzen, konkreten Lerneinheiten vorbereiten',
    );
    if (!result.success) setError(result.error);
    else {
      setPlan(result.data);
      if (user) {
        const { error: saveError } = await supabase.from('study_plans').insert({
          user_id: user.id,
          title: result.data.title,
          goal: result.data.goal,
          timeframe_weeks: 1,
          units: result.data.units,
          progress: 0,
        });
        if (saveError) setError(`Der Lernplan ist da, aber beim Speichern klemmts: ${userError(saveError)}`);
      }
    }
    setPlanning(false);
  };

  return (
    <section className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-cyan-300"><CalendarDays size={18} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Lernkalender</span></div>
          <h2 className="mt-2 text-xl font-semibold text-white">Aufgaben & Prüfungen</h2>
          <p className="mt-1 text-sm text-gray-400">Behalte Fristen im Blick und lass dir daraus einen datierten Lernplan erstellen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"><Plus size={16} /> Hinzufügen</button>
          <button onClick={() => void createPlan()} disabled={planning} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={16} /> {planning ? 'Plan wird erstellt ...' : 'Lernplan erstellen'}</button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-white/5 bg-black/10 p-3 text-xs sm:grid-cols-2">
        <p className={hasOpenTasks ? 'text-emerald-300' : 'text-amber-300'}>{hasOpenTasks ? '✓ Offene Aufgaben bestätigt' : '○ Noch keine bestätigte offene Aufgabe'}</p>
        <p className={hasAnalyzedMaterial ? 'text-emerald-300' : 'text-amber-300'}>{hasAnalyzedMaterial ? '✓ Lernmaterial analysiert' : '○ Lernmaterial erst analysieren'}</p>
        <p className={hasOpenTasks && tasks.every((task) => task.due_date) ? 'text-emerald-300' : 'text-amber-300'}>{hasOpenTasks && tasks.every((task) => task.due_date) ? '✓ Fristen/Zeitraum vorhanden' : '○ Fristen oder Zeitraum ergänzen'}</p>
        <p className={aiConfigured ? 'text-emerald-300' : 'text-amber-300'}>{aiConfigured ? '✓ KI ist startklar' : '○ KI-Konfiguration fehlt'}</p>
      </div>

      {showForm && (
        <form onSubmit={(event) => void saveTask(event)} className="mt-5 grid gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 sm:grid-cols-2">
          <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Titel, z. B. Mathe Übungsblatt" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50 sm:col-span-2" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Beschreibung (optional)" className="min-h-20 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50 sm:col-span-2" />
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Fach" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
          <select value={form.task_type} onChange={(event) => setForm({ ...form, task_type: event.target.value as LearningTask['task_type'] })} className="rounded-lg border border-white/10 bg-[#15151f] px-3 py-2 text-sm text-white outline-none"><option value="assignment">Aufgabe</option><option value="exam">Prüfung</option></select>
          <label className="text-xs text-gray-400">Fälligkeits-/Prüfungsdatum<input required type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs text-gray-400">Geschätzte Stunden<input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={(event) => setForm({ ...form, estimated_hours: event.target.value })} placeholder="optional" className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={resetForm} className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white"><X size={16} /></button><button disabled={saving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Speichert ...' : editingId ? 'Aktualisieren' : 'Speichern'}</button></div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="mt-5 space-y-3">
        {loading && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Kalender wird geladen ...</div>}
        {!loading && !Object.keys(groupedTasks).length && <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">Noch keine Aufgaben oder Prüfungen. Starte mit deinem ersten Eintrag.</p>}
        {Object.entries(groupedTasks).map(([date, dateTasks]) => (
          <div key={date} className="rounded-xl border border-white/5 bg-black/10 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-200"><CalendarDays size={15} />{new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <div className="space-y-2">{dateTasks.map((task) => <div key={task.id} className={`flex items-start gap-3 rounded-lg px-2 py-2 ${task.completed ? 'opacity-50' : ''}`}>
              <button onClick={() => void toggleTask(task)} className="mt-0.5 text-cyan-300" aria-label={task.completed ? 'Als offen markieren' : 'Als erledigt markieren'}>{task.completed ? <Check size={17} /> : <Circle size={17} />}</button>
              <div className="min-w-0 flex-1"><p className={`text-sm font-medium text-white ${task.completed ? 'line-through' : ''}`}>{task.title}</p><p className="text-xs text-gray-500">{task.task_type === 'exam' ? 'Prüfung' : 'Aufgabe'} · {task.subject}{task.estimated_hours ? ` · ${task.estimated_hours} h` : ''}</p>{task.description && <p className="mt-1 text-xs text-gray-400">{task.description}</p>}</div>
              <button onClick={() => editTask(task)} className="text-gray-500 hover:text-white" aria-label="Bearbeiten"><Edit3 size={15} /></button><button onClick={() => void deleteTask(task)} className="text-gray-500 hover:text-red-300" aria-label="Löschen"><Trash2 size={15} /></button>
            </div>)}</div>
          </div>
        ))}
      </div>

      {plan && <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{plan.title}</h3><p className="mt-1 text-sm text-gray-400">{plan.goal}</p></div><button onClick={() => setPlan(null)} className="text-gray-500 hover:text-white" aria-label="Plan schließen"><X size={17} /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{plan.units.map((unit, index) => <div key={`${unit.title}-${index}`} className="rounded-lg border border-white/5 bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-white">{unit.title}</p>{unit.scheduled_date && <span className="text-xs text-cyan-300">{new Date(`${unit.scheduled_date}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>}</div><p className="mt-1 text-xs leading-5 text-gray-400">{unit.description}</p><p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Clock3 size={13} /> {unit.estimated_hours} h · {unit.topics.join(', ')}</p></div>)}</div></div>}
    </section>
  );
}
