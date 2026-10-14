// Lesson text supports paragraphs (blank line), line breaks and **bold**. Nothing else, so no HTML from lessons ever reaches the page.
import { Fragment } from 'react';

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export default function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className ?? 'rich'}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(line)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

export function Inline({ text }: { text: string }) {
  return <>{inline(text)}</>;
}
