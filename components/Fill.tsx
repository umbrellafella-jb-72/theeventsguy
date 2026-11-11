import { isPlaceholder } from '@/lib/legal';
/** A value from lib/legal.ts; placeholders are highlighted until they're filled in. */
export function Fill({ v }: { v: string }) {
  return isPlaceholder(v) ? <mark className="todo">{v}</mark> : <>{v}</>;
}
