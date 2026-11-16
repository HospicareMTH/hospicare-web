import type { ReactNode } from "react";

import type { ManualSection } from "../manual-content";

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}

export function ManualSectionArticle({ section }: { section: ManualSection }) {
  const titleId = `${section.id}-title`;

  return (
    <section
      id={section.id}
      aria-labelledby={titleId}
      className="flex scroll-mt-6 flex-col gap-6 text-base"
    >
      <header className="flex flex-col gap-2">
        <h2
          id={titleId}
          className="text-xl font-semibold tracking-tight text-balance"
        >
          {section.title}
        </h2>
        <p>{section.summary}</p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Quién lo usa: </span>
          {section.audience}
        </p>
      </header>

      {section.topics.map((topic) => (
        <div key={topic.title} className="flex flex-col gap-2">
          <Subheading>{topic.title}</Subheading>
          {topic.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {topic.steps.length > 0 && (
            <ol className="flex list-decimal flex-col gap-1 pl-6 marker:text-muted-foreground">
              {topic.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      ))}

      {section.states.length > 0 && (
        <div className="flex flex-col gap-2">
          <Subheading>Estados</Subheading>
          <dl className="flex flex-col gap-2">
            {section.states.map((state) => (
              <div key={state.name}>
                <dt className="font-medium">{state.name}</dt>
                <dd className="text-muted-foreground">{state.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Subheading>Reglas y límites</Subheading>
        <ul className="flex list-disc flex-col gap-1 pl-6 marker:text-muted-foreground">
          {section.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      {section.decisions.length > 0 && (
        <div className="flex flex-col gap-2">
          <Subheading>Por qué funciona así</Subheading>
          {section.decisions.map((decision) => (
            <p key={decision}>{decision}</p>
          ))}
        </div>
      )}
    </section>
  );
}
