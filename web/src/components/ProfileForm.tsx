"use client";

import {
  EDUCATION_OPTIONS,
  INTEREST_SUGGESTIONS,
  LEARNING_LANG_OPTIONS,
  MAX_PHOTOS,
  NATIVE_LANG_OPTIONS,
  ZODIAC_OPTIONS,
  levelOptionsFor,
  profileCompleteness,
  type CountryCode,
  type MyProfile,
} from "@/lib/profile";
import { ChineseVariant, Intent } from "@/lib/types";
import { compressImageFile } from "@/lib/photoUpload";
import { VoiceIntroRecorder } from "@/components/VoiceIntroRecorder";

const intentOpts: { id: Intent; label: string }[] = [
  { id: "language", label: "语伴" },
  { id: "friends", label: "交友" },
  { id: "romance", label: "缘分" },
];

export function CompletenessBar({
  profile,
  verified,
}: {
  profile: MyProfile;
  verified: boolean;
}) {
  const { percent, missing } = profileCompleteness(profile, verified);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">资料完善度</span>
        <span className="tabular-nums text-accent">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {missing.length > 0 && percent < 100 && (
        <p className="mt-1.5 text-[11px] text-muted">
          还可完善：{missing.slice(0, 4).join("、")}
          {missing.length > 4 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

type Draft = MyProfile;

export function ProfileBasicsFields({
  value,
  onChange,
  locked,
}: {
  value: Draft;
  onChange: (p: Partial<Draft>) => void;
  locked?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field label="昵称 *">
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="你希望别人怎么称呼你"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
        />
      </Field>

      <Field
        label="性别 *"
        hint={locked ? "注册后不可修改" : "请如实选择，之后不可修改"}
      >
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              disabled={locked}
              onClick={() => onChange({ gender: g })}
              className={`rounded-xl border py-2.5 text-sm disabled:opacity-60 ${
                value.gender === g
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line"
              }`}
            >
              {g === "male" ? "男 Male" : "女 Female"}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="年龄 *"
        hint={locked ? "注册后不可修改" : "之后不可修改"}
      >
        <input
          type="number"
          min={18}
          max={99}
          disabled={locked}
          value={value.age ?? ""}
          onChange={(e) =>
            onChange({
              age: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="18+"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent disabled:opacity-60"
        />
      </Field>

      <Field
        label="国家 / 地区 *"
        hint={locked ? "注册后不可修改" : "之后不可修改"}
      >
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["US", "🇺🇸 美国"],
              ["CN", "🇨🇳 中国"],
              ["OTHER", "🌍 其他"],
            ] as [CountryCode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={locked}
              onClick={() => onChange({ country: id })}
              className={`rounded-xl border py-2 text-sm disabled:opacity-60 ${
                value.country === id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="意图（可多选）">
        <div className="flex flex-wrap gap-2">
          {intentOpts.map((i) => {
            const on = value.intents.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() =>
                  onChange({
                    intents: on
                      ? value.intents.filter((x) => x !== i.id)
                      : [...value.intents, i.id],
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line"
                }`}
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

export function ProfileAboutFields({
  value,
  onChange,
}: {
  value: Draft;
  onChange: (p: Partial<Draft>) => void;
}) {
  const toggleInterest = (t: string) => {
    const on = value.interests.includes(t);
    onChange({
      interests: on
        ? value.interests.filter((x) => x !== t)
        : [...value.interests, t].slice(0, 8),
    });
  };

  return (
    <div className="space-y-3">
      <ProfileLangFields value={value} onChange={onChange} />

      <Field label="城市">
        <input
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="如：上海 / Austin"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
        />
      </Field>
      <Field label="职业">
        <input
          value={value.occupation}
          onChange={(e) => onChange({ occupation: e.target.value })}
          placeholder="如：产品经理 / Software engineer"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
        />
      </Field>
      <Field label="学历">
        <select
          value={value.education}
          onChange={(e) => onChange({ education: e.target.value })}
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
        >
          <option value="">选填</option>
          {EDUCATION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
      <Field label="星座">
        <select
          value={value.zodiac}
          onChange={(e) => onChange({ zodiac: e.target.value })}
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
        >
          <option value="">选填</option>
          {ZODIAC_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
      <Field label="自我介绍">
        <textarea
          value={value.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          rows={3}
          placeholder="用几句话介绍自己，中英都可以～"
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
        />
      </Field>
      <Field label="语音打招呼（发现页可播放）">
        <VoiceIntroRecorder value={value} onChange={onChange} />
      </Field>
      <Field label="爱好（最多 8 个）">
        <div className="flex flex-wrap gap-2">
          {INTEREST_SUGGESTIONS.map((t) => {
            const on = value.interests.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleInterest(t)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  on
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

export function ProfileLangFields({
  value,
  onChange,
}: {
  value: Draft;
  onChange: (p: Partial<Draft>) => void;
}) {
  const levels = levelOptionsFor(value.learningLang);

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface/60 p-3.5">
      <Field label="母语 *">
        <div className="grid grid-cols-3 gap-2">
          {NATIVE_LANG_OPTIONS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() =>
                onChange({
                  nativeLang: lang === "其他 Other" ? "其他" : lang,
                  chineseVariants:
                    lang === "中文"
                      ? value.chineseVariants.length
                        ? value.chineseVariants
                        : ["mandarin"]
                      : [],
                })
              }
              className={`rounded-xl border py-2 text-sm ${
                (lang === "其他 Other" ? value.nativeLang === "其他" : value.nativeLang === lang)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </Field>

      {value.nativeLang === "中文" && (
        <Field label="中文变体（可多选）" hint="会说的都勾上">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["mandarin", "普通话 Mandarin"],
                ["cantonese", "粤语 Cantonese"],
              ] as [ChineseVariant, string][]
            ).map(([id, label]) => {
              const on = value.chineseVariants.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChange({
                      chineseVariants: on
                        ? value.chineseVariants.filter((v) => v !== id)
                        : [...value.chineseVariants, id],
                    })
                  }
                  className={`rounded-xl border py-2 text-sm ${
                    on
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="在学语言 *">
        <div className="grid grid-cols-3 gap-2">
          {LEARNING_LANG_OPTIONS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                const next = lang === "其他 Other" ? "其他" : lang;
                const opts = levelOptionsFor(next);
                onChange({
                  learningLang: next,
                  level: opts.includes(value.level) ? value.level : "",
                });
              }}
              className={`rounded-xl border py-2 text-sm ${
                (lang === "其他 Other"
                  ? value.learningLang === "其他"
                  : value.learningLang === lang)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </Field>

      <Field label="语言级别 *" hint="你在学语言的水平">
        <div className="flex flex-wrap gap-2">
          {levels.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => onChange({ level: lv })}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                value.level === lv
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function ProfilePhotoFields({
  value,
  onChange,
}: {
  value: Draft;
  onChange: (p: Partial<Draft>) => void;
}) {
  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - value.photos.length;
    const picked = Array.from(files).slice(0, room);
    const urls: string[] = [];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) continue;
      // Compress so photos fit localStorage and still show on Discover (data: not in DB yet).
      if (f.size > 12 * 1024 * 1024) continue;
      try {
        urls.push(await compressImageFile(f));
      } catch {
        /* skip bad files */
      }
    }
    if (urls.length) onChange({ photos: [...value.photos, ...urls] });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        建议上传清晰自拍。最多 {MAX_PHOTOS} 张，至少 1 张。
      </p>
      <div className="grid grid-cols-3 gap-2">
        {value.photos.map((src, i) => (
          <div
            key={i}
            className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() =>
                onChange({
                  photos: value.photos.filter((_, j) => j !== i),
                })
              }
              className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-xs text-white"
            >
              ✕
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 text-[10px] text-white">
                主图
              </span>
            )}
          </div>
        ))}
        {value.photos.length < MAX_PHOTOS && (
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
            <span className="text-2xl">＋</span>
            添加照片
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-sm text-muted">{label}</label>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

