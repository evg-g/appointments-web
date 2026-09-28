import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { parseApiError } from "@/api/errors";
import { loginSchema } from "@/auth/login-schema";
import type { LoginValues } from "@/auth/login-schema";
import { useAuth } from "@/auth/useAuth";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@/components/ui";

interface LocationState {
  from?: { pathname?: string };
}

function redirectTarget(state: unknown): string {
  const from = (state as LocationState | null)?.from?.pathname;
  // Never bounce the user back to /login after a successful sign-in.
  return from !== undefined && from !== "/login" ? from : "/";
}

export function LoginRoute() {
  const { status, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const target = redirectTarget(location.state);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Already signed in (e.g. navigated to /login manually) — go straight to the app.
  if (status === "authenticated") {
    return <Navigate to={target} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate(target, { replace: true });
    } catch (error) {
      const parsed = parseApiError(error);
      let mappedField = false;
      for (const [field, message] of Object.entries(parsed.fieldErrors)) {
        if (field === "email" || field === "password") {
          setError(field, { message });
          mappedField = true;
        }
      }
      // 401 (bad credentials) and other non-field errors surface as a form-level alert.
      if (!mappedField) {
        setFormError(parsed.message);
      }
    }
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-semibold tracking-wide text-accent">Aurora Clinic</p>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {formError !== null && <Alert variant="danger">{formError}</Alert>}

            <Field label="Email" error={errors.email?.message} required>
              <Input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@clinic.example"
                {...register("email")}
              />
            </Field>

            <Field label="Password" error={errors.password?.message} required>
              <Input type="password" autoComplete="current-password" {...register("password")} />
            </Field>

            <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
