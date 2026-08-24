import { registerSchema } from './auth.schema';

const validPayload = {
  fullName: 'Juan Perez',
  email: 'juan@email.com',
  phone: '+59171234567',
  password: 'Str0ng!Pass',
  role: 'CLIENT' as const,
};

describe('registerSchema password rule', () => {
  it('accepts a password with lowercase, uppercase, digit and special char', () => {
    expect(registerSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts "=" as a valid special character', () => {
    const result = registerSchema.safeParse({ ...validPayload, password: 'Str0ng=Pass' });
    expect(result.success).toBe(true);
  });

  it.each([
    ['password1!', 'missing uppercase'],
    ['PASSWORD1!', 'missing lowercase'],
    ['Password!!', 'missing digit'],
    ['Password12', 'missing special character'],
    ['P1!aaaa', 'shorter than 8 characters'],
  ])('rejects "%s" (%s)', (password) => {
    const result = registerSchema.safeParse({ ...validPayload, password });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema phone rule', () => {
  it('accepts +591 followed by exactly 8 digits', () => {
    expect(registerSchema.safeParse(validPayload).success).toBe(true);
  });

  it.each([
    ['71234567', 'missing country code'],
    ['+5917123456', 'too few digits'],
    ['+591712345678', 'too many digits'],
    ['+59571234567', 'wrong country code'],
    ['+591 71234567', 'contains a space'],
  ])('rejects "%s" (%s)', (phone) => {
    const result = registerSchema.safeParse({ ...validPayload, phone });
    expect(result.success).toBe(false);
  });
});
