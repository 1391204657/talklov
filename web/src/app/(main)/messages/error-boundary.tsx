"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Keeps tab shell usable if messages client code throws. */
export default class MessagesErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">消息页暂时出错</h2>
          <p className="mt-2 text-sm text-muted">
            请刷新重试。若仍不行，退出登录后再进一次。
          </p>
          <a
            href="/messages"
            className="btn-grad mt-6 inline-block rounded-2xl px-6 py-3 text-sm font-semibold text-white"
          >
            刷新消息
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}
