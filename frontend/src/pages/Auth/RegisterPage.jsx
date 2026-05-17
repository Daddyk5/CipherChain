import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuthStore } from '../../store/authStore.js'

const personalFields = [
  { id: 'firstName', label: 'First name', autoComplete: 'given-name' },
  { id: 'lastName', label: 'Last name', autoComplete: 'family-name' },
  { id: 'dateOfBirth', label: 'Date of birth', type: 'date', autoComplete: 'bday' },
  { id: 'email', label: 'Email address', type: 'email', autoComplete: 'email' },
  { id: 'contactNumber', label: 'Contact number', type: 'tel', autoComplete: 'tel' },
]

const addressFields = [
  { id: 'streetAddress', label: 'Street address', autoComplete: 'street-address', wide: true },
  { id: 'city', label: 'City', autoComplete: 'address-level2' },
  { id: 'state', label: 'State / Province', autoComplete: 'address-level1' },
  { id: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
  { id: 'country', label: 'Country', autoComplete: 'country-name' },
]

export function RegisterPage() {
  const loginUser = useAuthStore((state) => state.loginUser)

  return (
    <AuthShell
      eyebrow="Registration"
      title="Create your secure identity"
      description="Complete your professional profile before binding a wallet identity and generating device keys."
    >
      <div className="space-y-6">
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">Personal information</h2>
            <p className="mt-1 text-sm text-slate-500">Use your legal or organization-approved identity details.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {personalFields.map((field) => (
              <RegistrationField key={field.id} {...field} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">Address details</h2>
            <p className="mt-1 text-sm text-slate-500">Used for enterprise account records and security verification.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {addressFields.map((field) => (
              <RegistrationField key={field.id} {...field} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">Account security</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RegistrationField id="password" label="Password" type="password" autoComplete="new-password" />
            <RegistrationField id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" />
          </div>
        </section>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
          <input type="checkbox" className="mt-1 accent-blue-400" />
          <span>I confirm that my information is accurate and agree to secure wallet-based identity verification.</span>
        </label>

        <Link to="/connect-wallet" onClick={() => loginUser({ email: 'new.operator@cipherchain.dev' })}>
          <Button className="w-full">Continue to wallet binding</Button>
        </Link>
        <p className="text-center text-sm text-slate-500">Already registered? <Link className="text-blue-200" to="/login">Sign in</Link></p>
      </div>
    </AuthShell>
  )
}

function RegistrationField({ id, label, type = 'text', autoComplete, wide = false }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`} htmlFor={id}>
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-700 focus:border-blue-300/60 focus:ring-4 focus:ring-blue-300/10"
      />
    </label>
  )
}
