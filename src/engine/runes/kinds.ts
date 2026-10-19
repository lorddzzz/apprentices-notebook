import type { KindId } from '$data';
import { landKind } from '../mix';
import type { Handler } from '../resolve';

const lands =
  (kind: KindId): Handler =>
  (ctx, t, flow) =>
    landKind(ctx, kind, t, flow);

/** What each Kind does to one target: lands it and mixes it with what is there (design §4). */
export const KIND_HANDLERS: Record<KindId, Handler> = {
  ink: lands('ink'),
  oil: lands('oil'),
  steam: lands('steam'),
  brass: lands('brass'),
  spark: lands('spark'),
};
