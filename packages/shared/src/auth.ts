export type LoginInput = { email: string; password: string };
export type SignUpInput = LoginInput & { name: string };
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  if (!isValidEmail(input.email)) errors.email = "E-mail inválido";
  if (!input.password) errors.password = "Informe a senha";
  return errors;
}

export function validateSignUp(input: SignUpInput): FieldErrors<SignUpInput> {
  const errors: FieldErrors<SignUpInput> = {};
  if (input.name.trim().length < 2) errors.name = "Informe seu nome";
  if (!isValidEmail(input.email)) errors.email = "E-mail inválido";
  const p = input.password;
  if (p.length < 8 || !/[a-zA-Z]/.test(p) || !/\d/.test(p)) {
    errors.password = "A senha precisa de pelo menos 8 caracteres, com letras e números";
  }
  return errors;
}

export function validateEmailCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
