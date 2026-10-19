/** One icon vocabulary shared by study cards and their desktop navigation. */
import {
  BookOpenIcon,
  FileTextIcon,
  HandHeartIcon,
  LandmarkIcon,
  LeafIcon,
  LightbulbIcon,
  LinkIcon,
  SearchIcon,
  TagsIcon,
  BookHeartIcon,
} from "lucide-react";

const icons = {
  BOOK_BACKGROUND: BookOpenIcon,
  HISTORICAL_CONTEXT: LandmarkIcon,
  STUDY_NOTE: FileTextIcon,
  KEY_LESSON: LightbulbIcon,
  APPLICATION: LeafIcon,
  CROSS_REFERENCES: LinkIcon,
  WORD_STUDY: SearchIcon,
  PRAYER: HandHeartIcon,
  TAGS: TagsIcon,
  REFLECTION: BookHeartIcon,
};

/** Decorative icons accompany visible labels, so no duplicate accessible name. */
export function SanctuarySectionIcon({
  type,
  className,
}: {
  type: keyof typeof icons;
  className?: string;
}): React.ReactNode {
  const Icon = icons[type];
  return <Icon className={className} aria-hidden="true" />;
}

/** Serializable navigation entries allow server Markdown and client scrolling. */
export type SanctuaryContentsItem = {
  id: string;
  title: string;
  type: keyof typeof icons;
};
