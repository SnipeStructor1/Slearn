import { Sparkles, BookOpen, Brain, Users, Zap, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';

type Props = {
  onGetStarted: () => void;
  onExplore: () => void;
};

export function Landing({ onGetStarted, onExplore }: Props) {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Generation',
      desc: 'Type a topic or paste your notes — AI creates flashcards and summaries instantly. No manual card creation.',
      color: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Brain,
      title: 'Smart Study Modes',
      desc: 'Flip through flashcards with spaced repetition, or test yourself with auto-generated quizzes.',
      color: 'from-emerald-400 to-teal-500',
    },
    {
      icon: Users,
      title: 'Community Marketplace',
      desc: 'Explore and save study sets created by other students. Share your knowledge with the community.',
      color: 'from-orange-400 to-pink-500',
    },
    {
      icon: Zap,
      title: 'AI Tutor Assistant',
      desc: 'Stuck on a concept? Ask the AI tutor to explain it simpler or dive deeper — right in your study session.',
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
                AI-powered flashcards
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
              yLearn turns any topic, text, or notes into structured flashcards and quizzes instantly.
              Built for middle and high school students who want to learn faster.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:brightness-110"
              >
                Get Started Free
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={onExplore}
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
              >
                Explore Sets
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
          <p className="mt-2 text-gray-400">Join yLearn and start studying smarter today.</p>
          <button
            onClick={onGetStarted}
            className="mt-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110"
          >
            Create Your First Study Set
          </button>
        </div>
      </section>
    </div>
  );
}
