import {
  AccessToken,
} from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';
import { NextResponse } from "next/server";

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  agentName?: string;
};

export async function GET(request: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error("LIVEKIT_URL is not defined");
    }
    if (API_KEY === undefined) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }
    if (API_SECRET === undefined) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    // 从 URL 获取选中的助手
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent') || 'stewardess'; // 默认值

    const participantIdentity = `voice_assistant_${agentId}_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_${agentId}_room_${Math.floor(Math.random() * 10_000)}`;

    // 使用 createTokenWithAgentDispatch 生成 token
    const participantToken = await createTokenWithAgentDispatch(participantIdentity, roomName, agentId);

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName: participantIdentity,
      agentName: agentId,
    };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Connection error:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Unknown error', 
      { status: 503 }
    );
  }
}

async function createTokenWithAgentDispatch(identity: string, roomName: string, agentName: string): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: identity,
    ttl: "15m",
  });

  // 添加房间权限
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  // 设置RoomConfiguration
  const roomConfig = new RoomConfiguration({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 2,
    agents: [
      new RoomAgentDispatch({
        agentName: agentName,
        metadata: JSON.stringify({
          type: 'voice_assistant',
          role: agentName,
          version: '1.0'
        }),
      }),
    ],
  });

  at.roomConfig = roomConfig;

  // 添加调试日志
  console.log('Room configuration:', {
    name: roomName,
    identity: identity,
    agentName: agentName,
    config: roomConfig
  });

  return at.toJwt();
}
