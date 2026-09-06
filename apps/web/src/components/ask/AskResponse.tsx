import type {
  ResponseEntity,
  ResponseWidget,
} from "../../lib/ask-flow/assistant/response-shape";

function EntityRow({ entity }: { readonly entity: ResponseEntity }) {
  const className = "flow-ask-response__entity";
  if (entity.href) {
    return (
      <li
        className={className}
        data-tone={entity.tone ?? "neutral"}
        data-testid="ask-response-entity"
      >
        <a className="flow-ask-response__entity-link" href={entity.href}>
          {entity.label}
        </a>
        {entity.meta ? (
          <span className="flow-ask-response__entity-meta">{entity.meta}</span>
        ) : null}
      </li>
    );
  }
  return (
    <li
      className={className}
      data-tone={entity.tone ?? "neutral"}
      data-testid="ask-response-entity"
    >
      <span className="flow-ask-response__entity-label">{entity.label}</span>
      {entity.meta ? (
        <span className="flow-ask-response__entity-meta">{entity.meta}</span>
      ) : null}
    </li>
  );
}

function WidgetView({ widget }: { readonly widget: ResponseWidget }) {
  if (widget.type === "metrics") {
    return (
      <dl className="flow-ask-response__metrics" data-testid="ask-response-metrics">
        {widget.metrics.map((metric) => (
          <div
            key={metric.label}
            className="flow-ask-response__metric"
            data-tone={metric.tone ?? "neutral"}
          >
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (widget.type === "entities") {
    return (
      <div className="flow-ask-response__group" data-testid="ask-response-entities">
        {widget.title ? (
          <p className="flow-ask-response__title">{widget.title}</p>
        ) : null}
        <ul className="flow-ask-response__entities">
          {widget.entities.map((entity) => (
            <EntityRow key={entity.id} entity={entity} />
          ))}
        </ul>
      </div>
    );
  }

  if (widget.type === "comparison") {
    return (
      <div className="flow-ask-response__group" data-testid="ask-response-comparison">
        {widget.title ? (
          <p className="flow-ask-response__title">{widget.title}</p>
        ) : null}
        <ul className="flow-ask-response__comparison">
          {widget.rows.map((row) => (
            <li key={row.label} className="flow-ask-response__comparison-row">
              <span className="flow-ask-response__comparison-label">
                {row.label}
              </span>
              <span className="flow-ask-response__comparison-current">
                {row.current}
              </span>
              {row.baseline ? (
                <span className="flow-ask-response__comparison-baseline">
                  {row.baseline}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="flow-ask-response__analysis" data-testid="ask-response-analysis">
      {widget.items.map((item) => (
        <li key={item.statement} className="flow-ask-response__analysis-item">
          <span className="flow-ask-response__claim" data-claim={item.claim}>
            {item.claim}
          </span>
          <span className="flow-ask-response__analysis-statement">
            {item.statement}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AskResponse({
  widgets,
}: {
  readonly widgets: readonly ResponseWidget[];
}) {
  if (widgets.length === 0) return null;
  return (
    <div className="flow-ask-response" data-testid="ask-response">
      {widgets.map((widget, index) => (
        <WidgetView key={index} widget={widget} />
      ))}
    </div>
  );
}
