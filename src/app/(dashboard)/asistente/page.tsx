import type { Metadata } from "next";
import { AssistantView } from "@/components/modules/assistant-view";
export const metadata: Metadata = { title: "Asistente" };
export default function Page() { return <AssistantView />; }
