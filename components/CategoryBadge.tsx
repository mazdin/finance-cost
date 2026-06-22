"use client";

interface CategoryBadgeProps {
  name: string;
  icon: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function CategoryBadge({ name, icon, color, selected, onClick }: CategoryBadgeProps) {
  return (
    <span
      className={`category-badge ${selected ? "selected" : ""}`}
      style={{
        "--badge-color": color,
        background: selected ? color : "transparent",
        borderColor: color,
        color: selected ? "#fff" : color,
      } as React.CSSProperties}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <span className="category-icon">{icon}</span>
      <span className="category-name">{name}</span>
    </span>
  );
}
