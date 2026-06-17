import type { ReactNode } from "react";
import { Eyebrow } from "./ui";

export function PageIntro({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="shell flex flex-col gap-6 pb-12 pt-20 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="t-heading-lg max-w-[22ch]">{title}</h1>
        {children ? <p className="t-subheading measure text-ash">{children}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
