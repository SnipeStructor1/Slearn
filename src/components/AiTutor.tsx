import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { homeworkHelp, tutorChat } from '@/lib/ai-client';
import { useAuth } from '@/lib/auth-context';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  cardContext?: { front: string; back: string } | null;
};

// Simple AI tutor that generates contextual explanations
function generateResponse(question: string, context?: { front: string; back: string } | null): string {
  const q = question.toLowerCase();

  if (q.includes('simpler') || q.includes('simplify') || q.includes('easier') || q.includes('explain')) {
    if (context) {
      // Break down the back into simpler terms
      const sentences = context.back.split('. ').filter((s) => s.length > 0);
      if (sentences.length > 0) {
        return `Let me break this down:\n\n${context.front} is basically ${sentences[0].toLowerCase()}.\n\nThink of it this way: ${sentences.length > 1 ? sentences[1] : 'It\'s a key concept that you\'ll use throughout this subject.'}\n\nThe main takeaway is that ${context.front} plays an important role, and understanding it will help you connect other concepts together.`;
      }
      return `Sure! Let me explain ${context.front} more simply:\n\n${context.back}\n\nIn short, ${context.front} is an important concept to remember for your studies. Try to connect it with things you already know — that makes it easier to remember!`;
    }
    return `I'd be happy to explain that more simply! Could you click on a specific flashcard first, then ask me to explain it? That way I can give you a more targeted breakdown.`;
  }

  if (q.includes('example') || q.includes('example of')) {
    if (context) {
      return `Here's an example for ${context.front}:\n\n${context.back}\n\nFor instance, in real life, you might encounter this when studying for an exam or doing homework. The key is to remember the core idea: ${context.back.split('.')[0]}.`;
    }
    return `Great question! Examples are one of the best ways to learn. Could you specify which concept you'd like an example for?`;
  }

  if (q.includes('why') || q.includes('how')) {
    if (context) {
      return `That's a great question about ${context.front}!\n\nHere's what you need to know: ${context.back}\n\nThe reason this matters is because it connects to broader concepts in this subject. Understanding the "why" behind it will help you remember it long-term.`;
    }
    return `That's a thoughtful question! To give you the best answer, could you click on a flashcard related to your question? I can then explain it in the context of what you're studying.`;
  }

  if (q.includes('what is') || q.includes('what are') || q.includes('define')) {
    if (context) {
      return `${context.front} is defined as: ${context.back}\n\nThis is a key term you should be able to recall and explain in your own words for your exam.`;
    }
    return `Great question! Could you click on a related flashcard? I can then give you a detailed explanation connected to what you're studying.`;
  }

  if (context) {
    return `That's a great question! Based on what we're studying, ${context.front} relates to your question. Here's what I know:\n\n${context.back}\n\nWould you like me to explain this more simply, or give you an example?`;
  }

  return `I'm your AI study tutor! I can help explain concepts from your flashcards. Try asking me to "explain this simpler" or "give me an example" while you're looking at a flashcard. You can also ask me "what is [term]?" or "why is this important?"`;
}

export function AiTutor({ open, onClose, cardContext }: Props) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Tutor. Stuck on a concept? Ask me to explain it simpler, give an example, or ask any follow-up question!",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // When cardContext changes, show a hint
  useEffect(() => {
    if (cardContext && open) {
      setMessages((prev) => [
        ...prev.filter((m) => m.role === 'user' || prev.indexOf(m) < 1),
        {
          role: 'assistant',
          content: `I see you're looking at "${cardContext.front}". Want me to explain it simpler, give an example, or answer a specific question about it?`,
        },
      ]);
    }
  }, [cardContext]);

  const handleSend = async () => {
    if (!input.trim() || thinking) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const context = { ...(cardContext ? { flashcards: [cardContext] } : {}), app_language: profile?.app_language || 'de', learning_language: profile?.learning_language || 'de' };
    const result = /homework|hausaufgabe|aufgabe/i.test(userMsg.content)
      ? await homeworkHelp(userMsg.content, context)
      : await tutorChat(userMsg.content, context);
    const response = result.success ? result.data.reply : generateResponse(userMsg.content, cardContext);
    setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    setThinking(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md animate-slide-in-right flex-col border-l border-white/10 bg-[#12121a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 p-1.5">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Tutor</h3>
              <p className="text-xs text-gray-500">Ask me anything</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Context hint */}
        {cardContext && (
          <div className="border-b border-white/5 bg-violet-500/5 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-violet-300">
              <Lightbulb size={14} />
              <span>Context: <strong>{cardContext.front}</strong></span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-white/5 text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {cardContext && (
          <div className="flex gap-2 border-t border-white/5 px-4 py-2">
            <button
              onClick={() => { setInput('Explain this simpler'); }}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-all"
            >
              Explain simpler
            </button>
            <button
              onClick={() => { setInput('Give me an example'); }}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-all"
            >
              Give an example
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              className="flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 p-2.5 text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
