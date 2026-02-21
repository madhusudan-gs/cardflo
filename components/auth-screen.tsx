
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Label } from '@/components/ui/shared'
import { Loader2 } from 'lucide-react'

interface AuthScreenProps {
    onAuthSuccess: () => void
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const handleGoogleAuth = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            })
            if (error) throw error
        } catch (err: any) {
            setError(err.message)
            setIsLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Please enter your email address first.")
            return
        }
        setIsLoading(true)
        setError(null)
        setMessage(null)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) throw error
            setMessage("Password reset link sent! Check your inbox.")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (isSignUp) {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                if (data.session || data.user) {
                    if (data.session) {
                        onAuthSuccess()
                    } else if (data.user) {
                        // This happens if "Confirm Email" is still ON in Supabase
                        setMessage("Check your email for a confirmation link!")
                    }
                }
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                if (data.session) onAuthSuccess()
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6 glass-panel rounded-2xl max-w-md w-full mx-auto mt-10">
            <div className="space-y-4 text-center flex flex-col items-center">
                <img src="/logo.png" alt="Cardflo" className="h-20 w-auto object-contain" />
                <p className="text-slate-400 text-sm">
                    {isSignUp ? 'Create your account' : 'Welcome back'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {!isSignUp && (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-xs text-emerald-400 hover:underline"
                            >
                                Forgot Password?
                            </button>
                        )}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {message && (
                    <div className="text-emerald-400 text-sm bg-emerald-400/10 p-3 rounded border border-emerald-400/20">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded border border-red-400/20">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSignUp ? (
                        'Create Account'
                    ) : (
                        'Sign In'
                    )}
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-950 px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 bg-white text-black hover:bg-slate-100 border-none"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Google
                </Button>

                <div className="text-center text-sm text-slate-400">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        className="text-emerald-400 hover:underline"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </form>
        </div>
    )
}
