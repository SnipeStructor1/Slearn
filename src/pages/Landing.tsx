import { Sparkles, BookOpen, Brain, LockKeyhole, Zap, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/components/Logo';

type Props = {
  onGetStarted: () => void;
};

export function Landing({ onGetStarted }: Props) {
  const [pricingOpen, setPricingOpen] = useState(false);
  const features = [
    {
      icon: Sparkles,
      title: 'Complete AI Learning',
      desc: 'Turn notes, documents, assignments, and questions into clear explanations, study plans, summaries, and practice.',
      color: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Brain,
      title: 'Your Private Workspace',
      desc: 'Keep every note, upload, assignment, and learning conversation private and organized in one place.',
      color: 'from-emerald-400 to-teal-500',
    },
    {
      icon: LockKeyhole,
      title: 'Private by Design',
      desc: 'No public learning-card pressure and no forced sharing. Slearn is your confidential learning space.',
      color: 'from-orange-400 to-pink-500',
    },
    {
      icon: Zap,
      title: 'AI Tutor Assistant',
      desc: 'Get clear explanations, homework help, examples, summaries, and personalized next steps in context.',
      color: 'from-violet-400 to-purple-500',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Study smarter with
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                your complete AI learning workspace
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
              Slearn turns notes, documents, homework, and questions into a clear, private learning system.
              Everything you need for focused learning — powered by AI and built around you.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:brightness-110"
              >
                Start learning with Slearn
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => setPricingOpen(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
              >
                Slearn Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-cyan-400" />
          <h2 className="mt-4 text-3xl font-bold text-white">Ready to ace your next exam?</h2>
          <p className="mt-2 text-gray-400">Slearn Premium costs 20 CHF/month and unlocks the complete private AI learning experience.</p>
          <button
            onClick={onGetStarted}
            className="mt-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110"
          >
            Open your private learning workspace
          </button>
        </div>
      </section>

      {pricingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setPricingOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-cyan-400/20 bg-[#12121a] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Slearn Premium</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Alles für fokussiertes Lernen</h2>
              </div>
              <button onClick={() => setPricingOpen(false)} className="text-gray-500 hover:text-white"><X size={19} /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-400">20 CHF pro Monat für die vollständige private KI-Lernplattform — Notizen, Uploads, Hausaufgabenhilfe, Lernpläne, Erklärungen und Übung.</p>
            <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-300">Aktuell kostenlos</p>
              <p className="mt-1 text-xs text-emerald-200/70">Der Premium-Zugang ist während der Entwicklungsphase kostenlos. Es gibt keine öffentliche Bibliothek und keine erzwungene Freigabe.</p>
            </div>
            <button onClick={() => { setPricingOpen(false); onGetStarted(); }} className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white hover:brightness-110">
              Kostenlos starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
