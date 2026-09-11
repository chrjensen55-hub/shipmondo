import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function AdminLoginPage(){
 return <div className="login-shell"><Suspense fallback={null}><LoginForm/></Suspense></div>
}
