"use client";

export default function Learn() {
  return (
    <main>
      <div className="space-y-4 p-4 pt-3">
        {/* AI partner */}
        <div className="rounded-2xl bg-[linear-gradient(135deg,#ff5a7e22,#4a9eff22)] p-5">
          <div className="text-3xl">🤖</div>
          <h2 className="mt-2 text-lg font-bold">AI 口语陪练</h2>
          <p className="mt-1 text-sm text-muted">
            没人在线也能练。选一个场景，和 AI 角色开口说，不怕说错。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["咖啡店点单", "机场问路", "自我介绍", "约会聊天"].map((s) => (
              <button
                key={s}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Daily */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm text-muted">每日一句</div>
          <p className="mt-1 text-lg font-semibold">“百闻不如一见”</p>
          <p className="text-sm text-muted">
            Seeing once is better than hearing a hundred times.
          </p>
          <button className="mt-2 text-sm text-accent">🔊 跟读</button>
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted">本周学习进度</span>
            <span className="font-medium">4 / 7 天</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-2">
            <div className="btn-grad h-2 w-[57%] rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
