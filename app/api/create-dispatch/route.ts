import { AgentDispatchClient } from 'livekit-server-sdk';
import { NextResponse } from "next/server";

const LIVEKIT_URL = process.env.LIVEKIT_HTTPS_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: Request) {
  try {
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      throw new Error('Missing LiveKit configuration');
    }

    const { roomName, agentName } = await request.json();

    const agentDispatchClient = new AgentDispatchClient(
      LIVEKIT_URL,
      API_KEY,
      API_SECRET
    );

    // 创建dispatch请求
    const dispatch = await agentDispatchClient.createDispatch(roomName, agentName, {
      metadata: JSON.stringify({
        type: 'voice_assistant',
        role: agentName,
        version: '1.0'
      }),
    });

    // 获取当前房间的所有dispatches
    const dispatches = await agentDispatchClient.listDispatch(roomName);

    return NextResponse.json({
      dispatch,
      dispatchCount: dispatches.length,
    });

  } catch (error) {
    console.error('Dispatch error:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Unknown error',
      { status: 503 }
    );
  }
} 