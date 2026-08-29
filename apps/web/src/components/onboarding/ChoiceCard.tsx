"use client";

export function ChoiceCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`flow-choice-card ${selected ? "flow-choice-card--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="flow-choice-card__title">{title}</span>
      {description && (
        <span className="flow-choice-card__desc">{description}</span>
      )}
    </button>
  );
}

export function MultiSelectChoice({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string; description?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flow-choice-grid flow-choice-grid--2">
      {options.map((opt) => (
        <ChoiceCard
          key={opt.id}
          title={opt.label}
          {...(opt.description ? { description: opt.description } : {})}
          selected={selected.includes(opt.id)}
          onSelect={() => toggle(opt.id)}
        />
      ))}
    </div>
  );
}
