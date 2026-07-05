import { X } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";

type ModalShellProps = {
  ariaLabel?: string;
  bodyClassName?: string;
  children: ReactNode;
  closeLabel?: string;
  footer?: ReactNode;
  modalClassName?: string;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function ModalShell({
  ariaLabel,
  bodyClassName = "",
  children,
  closeLabel = "Close",
  footer,
  modalClassName = "",
  onClose,
  onSubmit,
  subtitle,
  title,
}: ModalShellProps) {
  const cardClassName = `modal-card ${modalClassName}`.trim();
  const bodyClasses = `modal-body ${bodyClassName}`.trim();
  const header = (
    <header className="modal-header">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </header>
  );
  const content = (
    <>
      {header}
      <div className={bodyClasses}>{children}</div>
      {footer ? <footer className="modal-footer">{footer}</footer> : null}
    </>
  );

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? String(title)}
      onMouseDown={onClose}
    >
      {onSubmit ? (
        <form
          className={cardClassName}
          onMouseDown={(event) => event.stopPropagation()}
          onSubmit={onSubmit}
        >
          {content}
        </form>
      ) : (
        <section
          className={cardClassName}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {content}
        </section>
      )}
    </div>
  );
}
