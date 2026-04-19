import type { FolderItemColor } from '@/api/model';

/** FolderColor → Tailwind bg 클래스 매핑 */
export const FOLDER_COLOR_MAP: Record<string, string> = {
  red: 'bg-red-400',
  orange: 'bg-orange-400',
  amber: 'bg-amber-400',
  yellow: 'bg-yellow-400',
  lime: 'bg-lime-400',
  green: 'bg-green-400',
  emerald: 'bg-emerald-400',
  teal: 'bg-teal-400',
  cyan: 'bg-cyan-400',
  sky: 'bg-sky-400',
  blue: 'bg-blue-400',
  indigo: 'bg-indigo-400',
  violet: 'bg-violet-400',
  purple: 'bg-purple-400',
  pink: 'bg-pink-400',
};

export function folderColorClass(color: FolderItemColor | string): string {
  return FOLDER_COLOR_MAP[color] ?? 'bg-blue-400';
}
