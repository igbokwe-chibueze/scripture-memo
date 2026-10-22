"use client";

/** On-demand study data uses request generations so rapid verse/author changes cannot display stale results. */
import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { showActionError } from "@/lib/errors/show-action-error";
import { toast } from "@/lib/toast";
import { useBibleResource } from "../hooks/use-bible-resource";
import {
  readBibleLexiconAction,
  readBibleStudyAction,
} from "../actions/bible-reader.action";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";
import type { BibleLexicon, BibleWord } from "../types/bible.types";

/** Definitions belong to the original word, never a guessed English token alignment. */
export function BibleStudyPanel({
  reference,
  authors,
  onOpen,
}: {
  reference: BibleReference;
  authors: { id: string; name: string }[];
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [tab, setTab] = useState<"words" | "commentary" | "crossReferences">(
    "words",
  );
  const [author, setAuthor] = useState("matthew-henry");
  const { book, chapter, verse, translation } = reference;
  const identity = `${book}:${chapter}:${verse}:${translation}:${tab}:${author}`;
  const load = useCallback(
    () =>
      readBibleStudyAction({
        book,
        chapter,
        verse,
        translation,
        tab,
        commentary: author,
      }),
    [book, chapter, verse, translation, tab, author],
  );
  const { data, loading, failed, retry } = useBibleResource(identity, load);
  const [selectedWord, setSelectedWord] = useState<{
    key: string;
    value: BibleWord;
  } | null>(null);
  const word = selectedWord?.key === identity ? selectedWord.value : null;
  const [lexicon, setLexicon] = useState<BibleLexicon | null>(null);
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [lexiconFailed, setLexiconFailed] = useState(false);
  const wordGeneration = useRef(0);

  async function selectWord(value: BibleWord): Promise<void> {
    const current = ++wordGeneration.current;
    setSelectedWord({ key: identity, value });
    setLexicon(null);
    setLexiconLoading(true);
    setLexiconFailed(false);
    try {
      const result = await readBibleLexiconAction(value.strongs);
      if (current !== wordGeneration.current) return;
      if (result.success) setLexicon(result.data ?? null);
      else {
        setLexiconFailed(true);
        showActionError(result);
      }
    } catch {
      if (current === wordGeneration.current) {
        setLexiconFailed(true);
        toast.error(t("failed"), { duration: Infinity });
      }
    } finally {
      if (current === wordGeneration.current) setLexiconLoading(false);
    }
  }
  return (
    <section
      aria-label={t("study")}
      className="space-y-4 rounded-card border border-border bg-card p-4"
    >
      <h2 className="font-heading text-xl text-primary">
        {bibleReferenceLabel(reference)}
      </h2>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("study")}
      >
        {(["words", "commentary", "crossReferences"] as const).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "default" : "secondary"}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className="flex-1 px-2 text-xs"
          >
            {t(item)}
          </Button>
        ))}
      </div>
      {tab === "commentary" && (
        <label className="block space-y-2">
          <span>{t("commentaryAuthor")}</span>
          <select
            className="bible-select"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          >
            {authors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {loading ? (
        <LoadingSpinner label={t("loading")} />
      ) : failed ? (
        <div role="alert">
          <p>{t("failed")}</p>
          <Button onClick={retry}>{t("retry")}</Button>
        </div>
      ) : (
        <>
          {tab === "words" && (
            <>
              <p className="text-sm text-muted-foreground">
                {t("wordSourceNote")}
              </p>
              <div className="flex flex-wrap gap-2">
                {data?.words?.map((item) => (
                  <Button
                    key={item.pos}
                    variant={word?.pos === item.pos ? "default" : "outline"}
                    aria-pressed={word?.pos === item.pos}
                    disabled={!/^[HG]\d{4,5}[a-z]?$/.test(item.strongs)}
                    onClick={() => void selectWord(item)}
                    className="h-auto flex-col py-2"
                  >
                    <span
                      dir={item.language === "greek" ? "ltr" : "rtl"}
                      lang={
                        item.language === "greek"
                          ? "grc"
                          : item.language === "aramaic"
                            ? "arc"
                            : "he"
                      }
                      className="text-xl"
                    >
                      {item.text}
                    </span>
                    <span className="text-xs">{item.gloss}</span>
                  </Button>
                ))}
              </div>
              {!data?.words?.length && <p>{t("noStudy")}</p>}
              {word && (
                <article className="space-y-3 border-t border-border pt-3">
                  <h3 className="font-heading text-2xl">{word.gloss}</h3>
                  <p>
                    {t(
                      `languages.${word.language === "greek" ? "greek" : word.language === "aramaic" ? "aramaic" : "hebrew"}`,
                    )}{" "}
                    · {word.transliteration} · {word.strongs}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {word.parsingFull}
                  </p>
                  {lexiconLoading ? (
                    <LoadingSpinner label={t("loading")} />
                  ) : lexiconFailed ? (
                    <Button
                      variant="secondary"
                      onClick={() => void selectWord(word)}
                    >
                      {t("retry")}
                    </Button>
                  ) : lexicon?.senses.length ? (
                    lexicon.senses.map((sense) => (
                      <div key={sense.id} className="space-y-2">
                        <p className="font-bold">
                          {sense.lemma} · {sense.transliteration}
                        </p>
                        <p className="whitespace-pre-line leading-relaxed">
                          {sense.definition}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>{t("noDefinition")}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("lexiconAttribution")}{" "}
                    <a
                      className="underline"
                      href="https://github.com/STEPBible/STEPBible-Data"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      STEPBible
                    </a>{" "}
                    ·{" "}
                    <a
                      className="underline"
                      href="https://creativecommons.org/licenses/by/4.0/"
                    >
                      CC BY 4.0
                    </a>
                  </p>
                </article>
              )}
            </>
          )}
          {tab === "commentary" && (
            <p className="max-h-[65dvh] overflow-y-auto whitespace-pre-line leading-relaxed">
              {data?.commentary || t("noCommentary")}
            </p>
          )}
          {tab === "crossReferences" && (
            <div className="flex flex-wrap gap-2">
              {data?.references?.length ? (
                data.references.map((item, index) => (
                  <Button
                    key={`${item.book}:${item.chapter}:${item.verse}:${index}`}
                    variant="secondary"
                    onClick={() => onOpen({ ...reference, ...item })}
                  >
                    {bibleReferenceLabel(item)}
                    {item.endVerse ? `–${item.endVerse}` : ""}
                  </Button>
                ))
              ) : (
                <p>{t("noStudy")}</p>
              )}
            </div>
          )}
          {data?.source && (
            <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
              <a
                className="underline"
                href={data.source.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.source.name}
              </a>{" "}
              ·{" "}
              <a
                className="underline"
                href={data.source.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("license")}
              </a>
              {data.source.licenseNotes && (
                <p className="mt-2">{data.source.licenseNotes}</p>
              )}
            </footer>
          )}
        </>
      )}
    </section>
  );
}
