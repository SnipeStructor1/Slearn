import {
  BookOpen, Dna, Languages, FlaskConical, Scroll, Sigma,
  Atom, Utensils, Globe2, Code, PenTool, Calculator,
  Microscope, History, Palette, Music, Heart, Brain,
  Rocket, Lightbulb, TreePine, Mountain, Waves, Trophy,
  type LucideIcon,
} from 'lucide-react';

export type ColorTheme = {
  id: string;
  label: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glow: string;
  accent: string;
  solidBg: string;
};

export const colorThemes: ColorTheme[] = [
  {
    id: 'cyan',
    label: 'Cyan',
    gradient: 'from-cyan-400 to-blue-600',
    badgeBg: 'from-cyan-500/20 to-blue-500/20',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/20',
    glow: 'shadow-cyan-500/20',
    accent: 'text-cyan-400',
    solidBg: 'bg-cyan-500',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    gradient: 'from-emerald-400 to-teal-600',
    badgeBg: 'from-emerald-500/20 to-teal-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/20',
    accent: 'text-emerald-400',
    solidBg: 'bg-emerald-500',
  },
  {
    id: 'orange',
    label: 'Orange',
    gradient: 'from-orange-400 to-amber-600',
    badgeBg: 'from-orange-500/20 to-amber-500/20',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-500/20',
    glow: 'shadow-orange-500/20',
    accent: 'text-orange-400',
    solidBg: 'bg-orange-500',
  },
  {
    id: 'violet',
    label: 'Violet',
    gradient: 'from-violet-400 to-purple-600',
    badgeBg: 'from-violet-500/20 to-purple-500/20',
    badgeText: 'text-violet-300',
    badgeBorder: 'border-violet-500/20',
    glow: 'shadow-violet-500/20',
    accent: 'text-violet-400',
    solidBg: 'bg-violet-500',
  },
  {
    id: 'pink',
    label: 'Pink',
    gradient: 'from-pink-400 to-rose-600',
    badgeBg: 'from-pink-500/20 to-rose-500/20',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-500/20',
    glow: 'shadow-pink-500/20',
    accent: 'text-pink-400',
    solidBg: 'bg-pink-500',
  },
  {
    id: 'red',
    label: 'Red',
    gradient: 'from-red-400 to-orange-600',
    badgeBg: 'from-red-500/20 to-orange-500/20',
    badgeText: 'text-red-300',
    badgeBorder: 'border-red-500/20',
    glow: 'shadow-red-500/20',
    accent: 'text-red-400',
    solidBg: 'bg-red-500',
  },
  {
    id: 'amber',
    label: 'Amber',
    gradient: 'from-amber-400 to-yellow-600',
    badgeBg: 'from-amber-500/20 to-yellow-500/20',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/20',
    glow: 'shadow-amber-500/20',
    accent: 'text-amber-400',
    solidBg: 'bg-amber-500',
  },
  {
    id: 'blue',
    label: 'Blue',
    gradient: 'from-blue-400 to-indigo-600',
    badgeBg: 'from-blue-500/20 to-indigo-500/20',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/20',
    glow: 'shadow-blue-500/20',
    accent: 'text-blue-400',
    solidBg: 'bg-blue-500',
  },
  {
    id: 'teal',
    label: 'Teal',
    gradient: 'from-teal-400 to-cyan-600',
    badgeBg: 'from-teal-500/20 to-cyan-500/20',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/20',
    glow: 'shadow-teal-500/20',
    accent: 'text-teal-400',
    solidBg: 'bg-teal-500',
  },
  {
    id: 'slate',
    label: 'Slate',
    gradient: 'from-slate-400 to-gray-600',
    badgeBg: 'from-slate-500/20 to-gray-500/20',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/20',
    glow: 'shadow-slate-500/20',
    accent: 'text-slate-400',
    solidBg: 'bg-slate-500',
  },
];

export const iconOptions: { name: string; Icon: LucideIcon }[] = [
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Dna', Icon: Dna },
  { name: 'Languages', Icon: Languages },
  { name: 'FlaskConical', Icon: FlaskConical },
  { name: 'Scroll', Icon: Scroll },
  { name: 'Sigma', Icon: Sigma },
  { name: 'Atom', Icon: Atom },
  { name: 'Utensils', Icon: Utensils },
  { name: 'Globe2', Icon: Globe2 },
  { name: 'Code', Icon: Code },
  { name: 'PenTool', Icon: PenTool },
  { name: 'Calculator', Icon: Calculator },
  { name: 'Microscope', Icon: Microscope },
  { name: 'History', Icon: History },
  { name: 'Palette', Icon: Palette },
  { name: 'Music', Icon: Music },
  { name: 'Heart', Icon: Heart },
  { name: 'Brain', Icon: Brain },
  { name: 'Rocket', Icon: Rocket },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'TreePine', Icon: TreePine },
  { name: 'Mountain', Icon: Mountain },
  { name: 'Waves', Icon: Waves },
  { name: 'Trophy', Icon: Trophy },
];

export function getTheme(id: string): ColorTheme {
  return colorThemes.find((t) => t.id === id) || colorThemes[0];
}

export function getIcon(name: string): LucideIcon {
  return iconOptions.find((i) => i.name === name)?.Icon || BookOpen;
}

// Map subject to a default theme + icon (used when creating new sets)
export const subjectDefaults: Record<string, { color: string; icon: string }> = {
  Biology: { color: 'emerald', icon: 'Dna' },
  Chemistry: { color: 'orange', icon: 'FlaskConical' },
  Physics: { color: 'blue', icon: 'Atom' },
  Math: { color: 'violet', icon: 'Sigma' },
  History: { color: 'amber', icon: 'Scroll' },
  French: { color: 'pink', icon: 'Languages' },
  Spanish: { color: 'red', icon: 'Languages' },
  English: { color: 'cyan', icon: 'BookOpen' },
  Geography: { color: 'teal', icon: 'Globe2' },
  'Computer Science': { color: 'slate', icon: 'Code' },
  General: { color: 'cyan', icon: 'BookOpen' },
};
