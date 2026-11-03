/** Builds the attribution block appended to every copied passage. */
export function attribution(p: { title: string; author: string; surahName: string; surah: number; from: number; to: number; provider: string; url: string }) {
  const range = p.from === p.to ? `${p.from}` : `${p.from}-${p.to}`;
  return `— ${p.title}، ${p.author}\n[${p.surahName} ${p.surah}:${range}] · ${p.provider}\n${p.url}`;
}
