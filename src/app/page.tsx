import { ChatPanel } from "@/components/chat-panel";
import { PortfolioContent } from "@/components/portfolio-content";

export default function Home() {
  return (
    <div className="app-shell">
      <PortfolioContent />
      <ChatPanel />
    </div>
  );
}
