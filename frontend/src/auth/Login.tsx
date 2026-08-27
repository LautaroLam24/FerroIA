import { useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Input';
import { useSession } from './useSession';

export function Login() {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <h1 className="text-xl font-semibold text-text">Iniciar sesión</h1>
          <FormField label="Email">
            <Input
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Contraseña">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <Button type="submit" loading={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
