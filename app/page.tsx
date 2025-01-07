"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  AgentState,
  DisconnectButton,
} from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";
import { MediaDeviceFailure } from "livekit-client";
import type { ConnectionDetails } from "./api/connection-details/route";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import { CloseIcon } from "@/components/CloseIcon";

// 定义助手类型
type Assistant = {
  id: string;
  name: string;
  title: string;
  description: string;
};

const assistants: Assistant[] = [
  {
    id: 'lawyer',
    name: '律师助手',
    title: '专业法律咨询',
    description: '专业法律咨询师'
  },
  {
    id: 'stewardess',
    name: '空乘助手',
    title: '航空旅行服务',
    description: '航空旅行咨询'
  }
];

export default function Page() {
  const [connectionDetails, updateConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);

  const onConnectButtonClicked = useCallback(async () => {
    if (!selectedAssistant) return;

    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );
    // 添加选中的助手ID作为查询参数
    url.searchParams.append('agent', selectedAssistant.id);
    
    const response = await fetch(url.toString());
    const connectionDetailsData = await response.json();
    updateConnectionDetails(connectionDetailsData);
  }, [selectedAssistant]);

  // 处理WebSocket连接成功后的逻辑
  const handleRoomConnected = useCallback(async () => {
    if (!connectionDetails) return;

    try {
      // 创建API路由来处理agent dispatch
      const response = await fetch('/api/create-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: connectionDetails.roomName,
          agentName: connectionDetails.agentName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create dispatch');
      }

      const data = await response.json();
      console.log('Created dispatch:', data);
    } catch (error) {
      console.error('Error creating dispatch:', error);
    }
  }, [connectionDetails]);

  return (
    <main
      data-lk-theme="default"
      className="h-full grid content-center bg-[var(--lk-bg)]"
    >
      <LiveKitRoom
        token={connectionDetails?.participantToken}
        serverUrl={connectionDetails?.serverUrl}
        connect={connectionDetails !== undefined}
        audio={true}
        video={false}
        onConnected={handleRoomConnected}
        onMediaDeviceFailure={onDeviceFailure}
        onDisconnected={() => {
          updateConnectionDetails(undefined);
        }}
        className="grid grid-rows-[2fr_1fr] items-center"
      >
        <SimpleVoiceAssistant onStateChange={setAgentState} />
        <div className="relative h-[100px]">
          <AnimatePresence>
            {agentState === "disconnected" && (
              <motion.div
                initial={{ opacity: 0, top: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, top: "-10px" }}
                transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
                className="absolute left-1/2 -translate-x-1/2 w-full flex flex-col items-center gap-8"
              >
                <div className="grid grid-cols-2 gap-4 w-[600px] mx-auto">
                  {assistants.map(assistant => (
                    <button
                      key={assistant.id}
                      onClick={() => setSelectedAssistant(assistant)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedAssistant?.id === assistant.id 
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-500 bg-gray-800/30'
                      }`}
                    >
                      <h3 className="text-lg font-bold text-white">{assistant.name}</h3>
                      <p className="text-sm text-gray-300">{assistant.title}</p>
                      <p className="text-xs text-gray-400">{assistant.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  disabled={!selectedAssistant}
                  onClick={onConnectButtonClicked}
                  className="uppercase px-4 py-2 bg-white text-black rounded-md disabled:opacity-50 hover:bg-gray-100"
                >
                  Start a conversation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {agentState !== "disconnected" &&
              agentState !== "connecting" && (
                <motion.div
                  initial={{ opacity: 0, top: "10px" }}
                  animate={{ opacity: 1, top: 0 }}
                  exit={{ opacity: 0, top: "-10px" }}
                  transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
                  className="flex h-8 absolute left-1/2 -translate-x-1/2 justify-center"
                >
                  <VoiceAssistantControlBar controls={{ leave: false }} />
                  <DisconnectButton>
                    <CloseIcon />
                  </DisconnectButton>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
        <RoomAudioRenderer />
        <NoAgentNotification state={agentState} />
      </LiveKitRoom>
    </main>
  );
}

function SimpleVoiceAssistant(props: {
  onStateChange: (state: AgentState) => void;
}) {
  const { state, audioTrack } = useVoiceAssistant();

  useEffect(() => {
    props.onStateChange(state);
  }, [props, state]);

  return (
    <div className="h-[300px] max-w-[90vw] mx-auto">
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer"
        options={{ minHeight: 24 }}
      />
    </div>
  );
}
function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}

