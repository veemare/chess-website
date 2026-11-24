interface TitleBadgeProps {
  title?: string | null;
}

export function TitleBadge({ title }: TitleBadgeProps) {
  const clean = title?.trim();
  if (!clean) return null;

  return (
    <span className="title-badge" title={`Title: ${clean}`}>
      {clean}
    </span>
  );
}
