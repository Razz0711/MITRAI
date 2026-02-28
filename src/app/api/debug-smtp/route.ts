import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const smtpEmail = process.env.SMTP_EMAIL || '';
  const smtpPass = process.env.SMTP_APP_PASSWORD || '';

  return NextResponse.json({
    smtpEmailSet: !!smtpEmail,
    smtpEmailLength: smtpEmail.length,
    smtpEmailTrimmedLength: smtpEmail.trim().length,
    smtpEmailHex: Buffer.from(smtpEmail).toString('hex'),
    smtpPassSet: !!smtpPass,
    smtpPassLength: smtpPass.length,
    smtpPassTrimmedLength: smtpPass.trim().length,
    smtpPassHex: Buffer.from(smtpPass).toString('hex'),
  });
}
