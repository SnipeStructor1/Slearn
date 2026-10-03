import { Sparkles, BookOpen, Brain, LockKeyhole, Zap, ArrowRight, FileText, Calendar, MessageSquare, GraduationCap } from 'lucide-react';
import { Logo } from '@/components/Logo';

type Props = {
  onGetStarted: () => void;
};

const features = [
  {
    icon: Sparkles,
    title: 'KI-gestütztes Lernen',
    desc: 'Verwandle deine Notizen, Dokumente und Aufgaben in klare Erklärungen, Lernpläne, Zusammenfassungen und Übungskarten – automatisch und in deinem Tempo.',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    icon: Brain,
    title: 'Dein privater Lernraum',
    desc: 'Sammle Notizen, PDFs und Aufgaben an einem Ort. Die KI kennt deinen Kontext und gibt dir Erklärungen, die genau zu deinem Stoff passen.',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    icon: MessageSquare,
    title: 'KI-Lernassistent',
    desc: 'Stelle Fragen zu deinem Material, hole dir Hausaufgabenhilfe oder lass dir schwierige Themen einfach erklären – direkt im Workspace-Chat.',
    color: 'from-orange-400 to-amber-500',
  },
  {
    icon: Calendar,
    title: 'Smarte Lernplanung',
    desc: 'Die KI erkennt Fristen aus deinen Notizen und Dokumenten, erstellt dir einen strukturierten Lernplan und hilft dir, Prüfungen rechtzeitig vorzubereiten.',
    color: 'from-violet-400 to-purple-500',
  },
  {
    icon: BookOpen,
    title: 'Karteikarten & Quiz',
    desc: 'Generiere aus deinem Material Karteikarten mit Abstandswiederholung und Multiple-Choice-Quizze mit Erklärungen zu jeder Antwort.',
    color: 'from-pink-400 to-rose-500',
  },
  {
    icon: LockKeyhole,
    title: 'Privat ohne Druck',
    desc: 'Keine öffentliche Bibliothek, keine erzwungene Freigabe. Alles bleibt in deinem persönlichen, geschützten Lernraum.',
    color: 'from-blue-400 to-indigo-500',
  },
];

const steps = [
  {
    icon: FileText,
    title: 'Notizen & Materialien sammeln',
    desc: 'Lade PDFs hoch, schreibe Mitschriften direkt ins Textfeld oder ziehe Dateien per Drag-and-drop rein. Alles wird gespeichert und bleibt privat.',
  },
  {
    icon: Zap,
    title: 'KI arbeitet für dich',
    desc: 'Die KI analysiert deinen Workspace, erkennt Themen und Fristen, erstellt Lernpläne und beantwortet deine Fragen mit Bezug auf dein Material.',
  },
  {
    icon: GraduationCap,
    title: 'Lernen & üben',
    desc: 'Nutze Karteikarten mit Wiederholungslogik, generiere Quizze und frage den KI-Tutor, wenn etwas unklar ist – alles an einem Ort.',
  },
];

export function Landing({ onGetStarted }: Props) {
  const scrollToExplanation = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 -z-10 h-[300px] w-[400px] rounded-full bg-emerald-500/8 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Lernen, das zu dir passt
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                mit KI und deinem privaten Lernraum
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
              Slernavia verwandelt deine Notizen, Dokumente und Hausaufgaben in eine strukturierte Lernwelt:
              Erklärungen, Lernpläne, Karteikarten und Quizze – alles aus deinem Material generiert und
              immer privat in deinem Workspace.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:brightness-110"
              >
                Jetzt starten
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={scrollToExplanation}
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-cyan-400/30 hover:bg-white/10"
              >
                So funktioniert's
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white">Alles für fokussiertes Lernen</h2>
          <p className="mt-3 max-w-2xl mx-auto text-sm text-gray-400">
            Sechs Funktionen, die zusammen einen kompletten Lernworkflow ergeben – von Notizen bis zur Prüfungsvorbereitung.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${color} p-3 shadow-lg`}>
                <Icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white">In drei Schritten zum Lernerfolg</h2>
          <p className="mt-3 max-w-2xl mx-auto text-sm text-gray-400">
            Kein Setup-Aufwand. Du sammelst dein Material, die KI übernimmt die Struktur und du lernst effektiv.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-bold text-white shadow-lg shadow-cyan-500/20">
                  {index + 1}
                </div>
                <step.icon size={22} className="text-cyan-300" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 text-center">
          <div className="absolute left-1/2 top-0 -z-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
          <BookOpen size={48} className="mx-auto text-cyan-400" />
          <h2 className="mt-4 text-3xl font-bold text-white">Bereit für deine nächste Prüfung?</h2>
          <p className="mt-3 max-w-xl mx-auto text-gray-400">
            Öffne deinen privaten Lernraum und starte in wenigen Sekunden. Kostenlos und ohne Verpflichtung.
          </p>
          <button
            onClick={onGetStarted}
            className="group mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:brightness-110 mx-auto"
          >
            Lernraum öffnen
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>
    </div>
  );
}
