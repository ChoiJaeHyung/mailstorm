// src/store/authStore.ts
import { create } from 'zustand'

interface User {
    id: number
    email: string
    name: string
    // 필요한 필드 추가
}

interface AuthState {
    accessToken: string | null
    user: User | null
    setAccessToken: (token: string) => void
    setUser: (user: User) => void
    resetAccessToken: () => void
}

const savedToken = localStorage.getItem('accessToken')
const savedUser = localStorage.getItem('user')

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: savedToken || null,
    user: savedUser ? JSON.parse(savedUser) : null,

    setAccessToken: (token) => {
        localStorage.setItem('accessToken', token)
        set({ accessToken: token })
    },

    setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user))
        set({ user })
    },

    resetAccessToken: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        set({ accessToken: null, user: null })
    },
}))
