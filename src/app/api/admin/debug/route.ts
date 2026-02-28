import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const email = process.env.ADMIN_EMAIL || '';
  const password = process.env.ADMIN_PASSWORD || '';

  return NextResponse.json({
    emailSet: !!email,
    emailLength: email.length,
    emailTrimmedLength: email.trim().length,
    emailValue: email.substring(0, 4) + '***',
    emailHex: Buffer.from(email).toString('hex'),
    passwordSet: !!password,
    passwordLength: password.length,
    passwordTrimmedLength: password.trim().length,
    passwordFirstChar: password.charAt(0),
    passwordLastChar: password.charAt(password.length - 1),
    passwordHex: Buffer.from(password).toString('hex'),
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ADMIN')),
  });
}
