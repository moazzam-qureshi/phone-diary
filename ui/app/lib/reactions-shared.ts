// Client-safe reaction constants/types. NO "server-only" — client components
// (ReactionBar, ReactionToasts, EntryCard) import these.

// The small cosy set people can react with. Display-only; edit freely.
export const REACTION_EMOJIS = ["❤️", "😊", "😢", "🔥", "👏", "🤗", "🌱"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const MAX_NOTE_LEN = 120;

export function isReactionEmoji(v: string): v is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(v);
}

// Shape used by the floating toast (a reaction on one of the viewer's own
// entries, joined to a short snippet + the reactor's display name).
export type ReactionToast = {
  id: string;
  emoji: string;
  note: string | null;
  entryId: string;
  entrySnippet: string;
  reactorName: string;
};
