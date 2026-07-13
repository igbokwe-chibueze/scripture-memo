export type PackWriteData = {
  name: string;
  description: string | null;
  slug: string;
};

export type AddVerseToPackResult = "added" | "duplicate" | "unavailable";

export type RemoveVerseFromPackResult = {
  removed: boolean;
  autoHidden: boolean;
};
