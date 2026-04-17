import { create } from 'zustand';

import { decodeToken } from '@/lib/auth';

interface AuthState {
  userId: string | null;
  nickname: string;
  role: string | undefined;
  init: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  nickname: '',
  role: undefined,
  init: () => {
    const t = decodeToken();
    if (t) set({ userId: t.sub, nickname: t.nickname, role: t.role });
  },
  clear: () => set({ userId: null, nickname: '', role: undefined }),
}));
