
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
                redirectTo: window.location.origin,
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
