import Markdown from "react-markdown";
import { safeArticleUrl } from "../lib/article-format";
import styles from "./blog.module.css";

/**
 * Shared public/editor preview renderer. React escapes text; raw HTML is skipped,
 * only semantic Markdown elements are permitted, and images/embedded scripts
 * cannot fetch external content. No dangerouslySetInnerHTML or HTML plugins.
 */
export function ArticleBody({ content }: { content: string }): React.ReactNode {
  return (
    <div className={styles.prose}>
      <Markdown
        skipHtml
        allowedElements={[
          "p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em",
          "blockquote", "code", "pre", "a", "hr", "br",
        ]}
        urlTransform={(url) => safeArticleUrl(url) ?? ""}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ href, children }) => href ? (
            <a href={href} rel="noopener noreferrer">{children}</a>
          ) : <span>{children}</span>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
