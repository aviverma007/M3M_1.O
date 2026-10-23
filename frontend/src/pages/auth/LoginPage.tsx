import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/http'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { LoadingButton } from '@/components/common'
import logo from '@/assets/images/m3m-logo.png'
import background from '@/assets/images/background.png'

type Values = { email: string; password: string }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Where each role lands after login (same rules as original). */
function landingFor(role: string, department: string | null) {
  const dept = department || ''
  const pickPortfolio = ['super_admin', 'general_admin'].includes(role) || (['design_admin', 'design_contributor'].includes(role) && (!dept || dept === 'design'))
  return pickPortfolio ? '/select-location' : '/dashboard'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<Values>({ defaultValues: { email: '', password: '' } })

  async function onSubmit(values: Values) {
    setLoading(true)
    try {
      const res = await login(values.email, values.password)
      navigate(landingFor(res.data.role, res.data.user.department))
    } catch (e) {
      const err = e as ApiError
      if (err.errorCode === 'LOCKED' || err.message?.toLowerCase().includes('locked')) {
        navigate('/account-locked', { state: { lockUntil: (err.data as { lockUntil?: string } | undefined)?.lockUntil } })
      } else {
        toast.error(err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }
  const submit = () => form.handleSubmit(onSubmit)()

  return (
    <div className="h-screen">
      <div className="h-full bg-cover bg-center" style={{ backgroundImage: `url(${background})` }}>
        <div className="container m-auto content-center h-full">
          <Card className="w-1/3 min-w-[300px] m-auto text-center text-lg">
            <CardHeader className="relative flex flex-col items-center">
              <div className="absolute top-4 left-4">
                <img src={logo} alt="M3M Logo" className="w-16" />
              </div>
              <CardTitle className="pt-8">Login</CardTitle>
              <CardDescription>Please enter your email and password to continue</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-center gap-3">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ validate: (v) => EMAIL_RE.test(v) || 'Email is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email here" {...field} onKeyDown={(e) => e.key === 'Enter' && submit()} />
                        </FormControl>
                        <FormMessage className="text-end text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    rules={{ minLength: { value: 8, message: 'password must be at least 8 characters.' }, required: 'password must be at least 8 characters.' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter your password"
                              {...field}
                              onKeyDown={(e) => e.key === 'Enter' && submit()}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:bg-blue-50"
                              onClick={() => setShowPassword((s) => !s)}
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </Button>
                          </div>
                        </FormControl>
                        <div className="flex justify-end mt-1">
                          <Button variant="link" className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800" onClick={() => navigate('/forgot-password')} type="button">
                            Forgot Password?
                          </Button>
                        </div>
                        <FormMessage className="text-end text-xs" />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter>
              <LoadingButton title="Login" handleClick={submit} loading={loading} className="w-full" variant="btnBlue" loadingText="Logging in" />
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
