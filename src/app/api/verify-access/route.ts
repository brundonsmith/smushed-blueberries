import { isValid } from '@/app/secret';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { answer } = await request.json();

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    const correctAnswer = process.env.SECURITY_QUESTION_SECRET;

    if (!correctAnswer) {
      console.error('SECURITY_QUESTION_SECRET environment variable not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (isValid(answer)) {
      return NextResponse.json({
        success: true,
        secret: correctAnswer,
        message: 'Access granted'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Incorrect answer'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Access verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}