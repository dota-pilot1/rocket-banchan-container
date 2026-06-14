"use client";

import { useSearchParams } from "next/navigation";
import { AgentChatClient } from "./AgentChatClient";

export function AgentChatGate() {
  const params = useSearchParams();
  const agentId = params.get("id") ?? "debate";
  return <AgentChatClient key={agentId} agentId={agentId} />;
}
