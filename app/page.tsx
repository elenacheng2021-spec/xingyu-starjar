'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Mic,
  Music2,
  PenLine,
  RefreshCw,
  Sparkles,
  Square,
  WandSparkles,
  X,
} from 'lucide-react';

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { startAmbientSound, stopAmbientSound } from '@/src/ambient';
import { loadStoredInspirations, storeInspiration, type StoredInspiration } from '@/src/storage';

type LampMode = 'warm' | 'cool' | 'off';
type ToneId = 'honey' | 'mist' | 'sage' | 'rose' | 'lilac';

type Inspiration = {
  id: string;
  content: string;
  kind: string;
  starColor: string;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentUrl: string | null;
  attachmentBlob?: Blob | null;
  sourceIds: string[];
  createdAt: number;
};

type Synthesis = {
  title: string;
  prompt: string;
  visualBrief: string;
  palette: string[];
};

const lampLabels: Record<LampMode, string> = {
  warm: '暖光',
  cool: '月光',
  off: '熄灯',
};

const starColors = ['honey', 'mist', 'sage', 'rose', 'lilac'];

const toneOptions: Array<{
  id: ToneId;
  label: string;
  direction: string;
  color: string;
  palette: string[];
}> = [
  { id: 'honey', label: '暖意', direction: '让想法更有人情味与温度', color: '#e6bd58', palette: ['#eadcae', '#9c8054', '#7f9274', '#f8f0dc'] },
  { id: 'mist', label: '冷静', direction: '从结构、秩序与观察出发', color: '#91b0bc', palette: ['#aec4c9', '#667e8b', '#d8e1df', '#f3efe4'] },
  { id: 'sage', label: '生长', direction: '寻找自然、循环与生命感', color: '#91aa83', palette: ['#a9bd9d', '#526b55', '#d5cba9', '#f1eadb'] },
  { id: 'rose', label: '叙事', direction: '让情绪、记忆与关系更突出', color: '#d69b8d', palette: ['#dfb0a1', '#8f675e', '#d8c7aa', '#f8eee3'] },
  { id: 'lilac', label: '奇想', direction: '主动打破常规并制造陌生感', color: '#a99bc2', palette: ['#b6a8ca', '#665f81', '#d8c995', '#f1eaf2'] },
];

const seedInspirations: Inspiration[] = [
  {
    id: 'seed-window',
    content: '雨停以后，窗上的水痕像一张正在消失的地图。',
    kind: 'note',
    starColor: 'mist',
    attachmentName: null,
    attachmentType: null,
    attachmentUrl: null,
    sourceIds: [],
    createdAt: Date.now() - 1000 * 60 * 32,
  },
  {
    id: 'seed-sound',
    content: '旧唱片刚落针时的沙沙声，可以成为页面进入的呼吸。',
    kind: 'note',
    starColor: 'honey',
    attachmentName: '午后的声音.wav',
    attachmentType: 'audio/wav',
    attachmentUrl: null,
    sourceIds: [],
    createdAt: Date.now() - 1000 * 60 * 80,
  },
  {
    id: 'seed-shadow',
    content: '让内容像蕾丝投影一样，只在光照到的地方被看见。',
    kind: 'note',
    starColor: 'sage',
    attachmentName: null,
    attachmentType: null,
    attachmentUrl: null,
    sourceIds: [],
    createdAt: Date.now() - 1000 * 60 * 160,
  },
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function shortIdea(text: string) {
  const clean = text.replace(/[。！？，、；：\n]/g, ' ').trim();
  return clean.length > 16 ? `${clean.slice(0, 16)}…` : clean;
}

function synthesize(stars: Inspiration[], toneId: ToneId): Synthesis {
  const tone = toneOptions.find((option) => option.id === toneId) ?? toneOptions[0];
  const ideas = stars.map((star) => shortIdea(star.content || star.attachmentName || '一段未命名的感受'));
  const first = ideas[0] ?? '一种熟悉的感受';
  const second = ideas[1] ?? '一个意外的动作';
  const third = ideas[2];
  const recipes = [
    {
      title: `让「${first}」拥有「${second}」的行为`,
      prompt: `以“${tone.label}”为基调：${tone.direction}。不要急着解释主题，先把“${first}”当作空间或界面的主体，再借用“${second}”的节奏设计一次进入、停留与离开的体验。哪一个微小反馈能让用户立刻感到它们属于同一个世界？`,
      visualBrief: `一幅以留白和局部光线为主的视觉实验：${first}成为前景触点，${second}转化为重复的材质、轨迹或声音波形${third ? `，并让${third}只在交互完成后短暂出现` : ''}。`,
      palette: tone.palette,
    },
    {
      title: `把「${second}」藏进「${first}」的背面`,
      prompt: `以“${tone.label}”为基调：${tone.direction}。为这个想法设计两层状态：第一眼只看见“${first}”，触摸、拖拽或等待之后才发现“${second}”。让揭示过程本身成为作品，而不是再增加一个说明按钮。`,
      visualBrief: `使用半透明叠层、玻璃折射与缓慢显影，让${second}像被保存的记忆一样藏在${first}之下。画面避免满铺，把变化集中在一个局部。`,
      palette: tone.palette,
    },
    {
      title: `给「${first}」一个会呼吸的时间尺度`,
      prompt: `以“${tone.label}”为基调：${tone.direction}。如果“${first}”不是静态内容，而是会在一天中变化的生命体，它早晨、傍晚和深夜分别会留下什么？再让“${second}”成为触发变化的唯一线索。`,
      visualBrief: `同一构图中以光温、颗粒密度与材质湿度表达时间，不切换页面；${second}化为一道很克制的运动线索。`,
      palette: tone.palette,
    },
  ];
  return recipes[Math.floor(Math.random() * recipes.length)];
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function Modal({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" onClick={onClose} aria-label="关闭弹窗" />
      <section className={className} role="dialog" aria-modal="true">
        <Button className="modal-close" variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭">
          <X />
        </Button>
        {children}
      </section>
    </div>
  );
}

export default function Home() {
  const [lampMode, setLampMode] = useState<LampMode>('warm');
  const [composerOpen, setComposerOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [flyingStar, setFlyingStar] = useState(false);
  const [collisionStars, setCollisionStars] = useState<Inspiration[]>([]);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [tonePickerOpen, setTonePickerOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ToneId>('honey');
  const [soundOn, setSoundOn] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sceneImage = `${import.meta.env.BASE_URL}wish-jar-ui-reference.png`;

  const visibleStars = useMemo(
    () => (inspirations.length ? inspirations : seedInspirations),
    [inspirations],
  );

  useEffect(() => {
    loadStoredInspirations()
      .then((rows) =>
        setInspirations(
          rows.map((row) => ({
            ...row,
            attachmentUrl: row.attachmentBlob ? URL.createObjectURL(row.attachmentBlob) : null,
          })),
        ),
      )
      .catch(() => setInspirations([]));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      stopAmbientSound();
    };
  }, []);

  const cycleLamp = () => {
    setLampMode((current) =>
      current === 'warm' ? 'cool' : current === 'cool' ? 'off' : 'warm',
    );
  };

  const chooseFile = (nextFile: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
    setError('');
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const recorded = new File(audioChunksRef.current, `灵感声音-${Date.now()}.webm`, {
          type: mime,
        });
        chooseFile(recorded);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('没有取得麦克风权限，也可以选择已有的声音文件。');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submitInspiration = async () => {
    if (!content.trim() && !file) {
      setError('先写下一句话，或留下一张图片／一段声音吧。');
      return;
    }
    if (file && file.size > 15 * 1024 * 1024) {
      setError('附件请控制在 15MB 以内。');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const stored: StoredInspiration = {
        id: crypto.randomUUID(),
        content: content.trim(),
        kind: 'note',
        starColor: starColors[Math.floor(Math.random() * starColors.length)],
        attachmentName: file?.name ?? null,
        attachmentType: file?.type ?? null,
        attachmentBlob: file,
        sourceIds: [],
        createdAt: Date.now(),
      };
      await storeInspiration(stored);
      const inspiration: Inspiration = {
        ...stored,
        attachmentUrl: file ? URL.createObjectURL(file) : null,
      };
      setInspirations((current) => [inspiration, ...current]);
      setFlyingStar(true);
      setComposerOpen(false);
      setContent('');
      chooseFile(null);
      window.setTimeout(() => setFlyingStar(false), 1300);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '投递失败，请再试一次');
    } finally {
      setSubmitting(false);
    }
  };

  const shakeJar = (toneId: ToneId) => {
    if (isShaking) return;
    setSelectedTone(toneId);
    setTonePickerOpen(false);
    const candidates = visibleStars.length >= 2 ? visibleStars : seedInspirations;
    const count = Math.min(candidates.length, Math.random() > 0.45 ? 3 : 2);
    const selected = shuffle(candidates).slice(0, count);
    setCollisionStars(selected);
    setIsShaking(true);
    setSynthesis(null);
    window.setTimeout(() => {
      setSynthesis(synthesize(selected, toneId));
      setIsShaking(false);
      setResultOpen(true);
    }, 1450);
  };

  const reroll = () => {
    const selected = shuffle(visibleStars.length >= 2 ? visibleStars : seedInspirations).slice(
      0,
      Math.min(3, Math.max(2, visibleStars.length)),
    );
    setCollisionStars(selected);
    setSynthesis(synthesize(selected, selectedTone));
  };

  const saveSynthesis = async () => {
    if (!synthesis) return;
    setSubmitting(true);
    try {
      const stored: StoredInspiration = {
        id: crypto.randomUUID(),
        content: `${synthesis.title}\n${synthesis.prompt}`,
        kind: 'generated',
        starColor: selectedTone,
        attachmentName: null,
        attachmentType: null,
        attachmentBlob: null,
        sourceIds: collisionStars.map((star) => star.id),
        createdAt: Date.now(),
      };
      await storeInspiration(stored);
      setInspirations((current) => [{ ...stored, attachmentUrl: null }, ...current]);
      setFlyingStar(true);
      setResultOpen(false);
      window.setTimeout(() => setFlyingStar(false), 1300);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSound = async () => {
    if (soundOn) {
      stopAmbientSound();
      setSoundOn(false);
      return;
    }
    await startAmbientSound();
    setSoundOn(true);
  };

  return (
    <main className={`desk-shell lamp-${lampMode} ${isShaking ? 'is-shaking' : ''}`}>
      <img
        className="desk-scene"
        src={sceneImage}
        alt="蕾丝窗帘与田园窗景前的原木书桌，中央摆放着装满纸星星的发光玻璃瓶"
      />
      <div className="scene-shade" aria-hidden="true" />

      <header className="top-rail">
        <a className="brand" href="#desk" aria-label="星予灵感瓶首页">
          <span className="brand-star">✦</span>
          <span>
            <strong>星予</strong>
            <small>灵感落下的地方</small>
          </span>
        </a>

        <div className="privacy-pill">
          <LockKeyhole aria-hidden="true" />
          私人书桌 · 仅此设备可进入
        </div>

        <span className="star-count" aria-label={`${visibleStars.length}颗灵感星`}>
          ✦ {visibleStars.length}
        </span>
      </header>

      <section id="desk" className="interaction-layer" aria-label="我的灵感书桌">
        <button className="object-layer lamp-object" type="button" onClick={cycleLamp} aria-label={`台灯当前为${lampLabels[lampMode]}，点击切换`}>
          <img src={sceneImage} alt="" aria-hidden="true" />
        </button>

        <button className="object-layer note-object" type="button" onClick={() => setComposerOpen(true)} aria-label="打开便签，记录文字、图片或声音灵感">
          <img src={sceneImage} alt="" aria-hidden="true" />
        </button>

        <button className="object-layer album-object" type="button" onClick={() => setAlbumOpen(true)} aria-label="打开私人灵感册">
          <img src={sceneImage} alt="" aria-hidden="true" />
        </button>

        <button className="object-layer music-object" type="button" onClick={toggleSound} aria-label={soundOn ? '关闭唱片环境音乐' : '播放唱片环境音乐'}>
          <img src={sceneImage} alt="" aria-hidden="true" />
          {soundOn && <span className="vinyl-note" aria-hidden="true">♪</span>}
        </button>

        <button className="object-layer jar-object" type="button" onClick={() => setTonePickerOpen(true)} disabled={isShaking} aria-label="触碰灵感瓶并选择碰撞基调">
          <img src={sceneImage} alt="" aria-hidden="true" />
        </button>

        {tonePickerOpen && (
          <div className="tone-picker" role="group" aria-label="选择这次灵感碰撞的基调">
            <span>选择碰撞基调</span>
            <div>
              {toneOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={`${option.label}：${option.direction}`}
                  aria-label={`${option.label}：${option.direction}`}
                  onClick={() => shakeJar(option.id)}
                >
                  <i style={{ color: option.color }}>★</i>
                </button>
              ))}
            </div>
            <button className="tone-close" type="button" onClick={() => setTonePickerOpen(false)} aria-label="收起基调选择">
              <X />
            </button>
          </div>
        )}

        <div className="jar-particles" aria-hidden="true">
          {Array.from({ length: 11 }).map((_, index) => (
            <i key={index}>✦</i>
          ))}
        </div>

        {flyingStar && (
          <div className="flying-star" aria-live="polite">
            ★<span className="sr-only">灵感已折成星星投入瓶中</span>
          </div>
        )}
      </section>

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} className="paper-dialog composer-dialog">
          <div className="dialog-header">
            <span className="eyebrow"><PenLine /> 今日便签</span>
            <h2 data-slot="dialog-title">刚才，什么轻轻碰了你一下？</h2>
            <p data-slot="dialog-description">
              写一句话，放进一张图片，或者留住一小段声音。它们都会被折成同一颗星。
            </p>
          </div>

          <Textarea
            className="inspiration-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 1200))}
            placeholder="例如：雨珠沿着玻璃滑落的速度，很像页面里的时间线……"
            aria-label="灵感内容"
          />
          <div className="counter">{content.length} / 1200</div>

          <div className="capture-tools" aria-label="添加附件">
            <label className="capture-button">
              <ImagePlus />
              添加图片
              <input
                type="file"
                accept="image/*"
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="capture-button">
              <Music2 />
              选择声音
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              className={`capture-button ${recording ? 'recording' : ''}`}
              type="button"
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? <Square /> : <Mic />}
              {recording ? '结束录音' : '现场录音'}
            </button>
          </div>

          {file && (
            <Attachment className="file-preview">
              <AttachmentMedia variant={file.type.startsWith('image/') ? 'image' : 'icon'}>
                {file.type.startsWith('image/') && previewUrl ? (
                  <img src={previewUrl} alt="待投递图片预览" />
                ) : (
                  <Music2 />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
                <AttachmentDescription>
                  {file.type.startsWith('image/') ? '图片灵感' : '声音灵感'} · {(file.size / 1024 / 1024).toFixed(1)}MB
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="移除附件" onClick={() => chooseFile(null)}>
                  <X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          )}

          {file?.type.startsWith('audio/') && previewUrl && (
            <audio className="audio-preview" controls src={previewUrl}>
              <track kind="captions" />
            </audio>
          )}

          {error && <p className="form-error">{error}</p>}

          <div data-slot="dialog-footer" className="paper-footer">
            <p><LockKeyhole /> 默认私密保存，你可以稍后选择公开。</p>
            <Button className="fold-button" onClick={submitInspiration} disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" /> : <Sparkles />}
              折成星星，投入瓶中
            </Button>
          </div>
      </Modal>

      <Modal open={resultOpen} onClose={() => setResultOpen(false)} className="alchemy-dialog">
          <div className="dialog-header">
            <span className="eyebrow"><WandSparkles /> 灵感碰撞完成</span>
            <h2 data-slot="dialog-title">{synthesis?.title ?? '星星还在靠近'}</h2>
            <p data-slot="dialog-description">它不是答案，而是一扇可以推开的门。</p>
          </div>

          <div className="collision-row" aria-label="参与碰撞的旧灵感">
            {collisionStars.map((star, index) => (
              <div className={`mini-star star-${star.starColor}`} key={star.id}>
                <span>★</span>
                <p>{shortIdea(star.content || star.attachmentName || '')}</p>
                {index < collisionStars.length - 1 && <b>＋</b>}
              </div>
            ))}
          </div>

          {synthesis && (
            <div className="synthesis-grid">
              <section className="prompt-card">
                <span><Lightbulb /> 创作提示</span>
                <p>{synthesis.prompt}</p>
              </section>
              <section className="visual-seed">
                <div
                  className="visual-seed-image"
                  style={{
                    backgroundImage: `linear-gradient(120deg, rgb(41 53 42 / 10%), rgb(252 223 142 / 22%)), url(${sceneImage})`,
                  }}
                />
                <div>
                  <span>视觉种子</span>
                  <p>{synthesis.visualBrief}</p>
                  <div className="palette" aria-label="建议配色">
                    {synthesis.palette.map((color) => (
                      <i key={color} style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          <div data-slot="dialog-footer" className="alchemy-footer">
            <Button variant="outline" onClick={reroll}>
              <RefreshCw /> 换一组碰撞
            </Button>
            <Button onClick={saveSynthesis} disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" /> : <Check />}
              收藏这颗新星
            </Button>
          </div>
      </Modal>

      <Modal open={albumOpen} onClose={() => setAlbumOpen(false)} className="album-dialog">
          <div className="dialog-header">
            <span className="eyebrow"><BookOpen /> 私人灵感册</span>
            <h2 data-slot="dialog-title">那些曾经闪过的念头</h2>
            <p data-slot="dialog-description">便签与碰撞生成的新提示都会安静地留在这里。</p>
          </div>

          <div className="album-list">
            {visibleStars.map((star) => (
              <article className="album-entry" key={star.id}>
                <span className={`entry-star star-${star.starColor}`}>★</span>
                <div>
                  <small>{star.kind === 'generated' ? '碰撞生成' : '灵感便签'} · {formatTime(star.createdAt)}</small>
                  <p>{star.content || star.attachmentName}</p>
                  {star.attachmentType?.startsWith('image/') && star.attachmentUrl && (
                    <img src={star.attachmentUrl} alt={star.attachmentName ?? '灵感图片'} />
                  )}
                  {star.attachmentType?.startsWith('audio/') && star.attachmentUrl && (
                    <audio controls src={star.attachmentUrl}>
                      <track kind="captions" />
                    </audio>
                  )}
                </div>
              </article>
            ))}
          </div>
      </Modal>
    </main>
  );
}
