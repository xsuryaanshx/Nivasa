import React from "react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { Loader2, ArrowDown } from "lucide-react";

interface Props {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
}

const PullingContent = () => (
  <div className="flex items-center justify-center py-6">
    <div className="flex h-10 w-10 items-center justify-center rounded-full glass-strong shadow-lg">
      <ArrowDown className="h-5 w-5 text-muted-foreground animate-bounce" />
    </div>
  </div>
);

const RefreshingContent = () => (
  <div className="flex items-center justify-center py-6">
    <div className="flex h-10 w-10 items-center justify-center rounded-full glass-strong shadow-lg">
      <Loader2 className="h-5 w-5 animate-spin text-brand" />
    </div>
  </div>
);

export function PullToRefreshWrapper({ onRefresh, children }: Props) {
  return (
    <PullToRefresh
      onRefresh={onRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
      pullDownThreshold={80}
      maxPullDownDistance={120}
      resistance={3}
      className="h-full w-full"
    >
      <div style={{ minHeight: "calc(100vh - 150px)" }}>
        {children}
      </div>
    </PullToRefresh>
  );
}
