import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { date, amount, direction, details, is_simulation } = body;

    const { data, error } = await supabase
      .from('buchungen')
      .insert([
        {
          id: uuidv4(),
          date,
          amount,
          direction,
          details,
          is_simulation,
          user_id: user.id,
          modified: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return new NextResponse('Error creating transaction', { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in transaction creation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 