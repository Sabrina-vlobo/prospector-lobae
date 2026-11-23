import styles from "./PageLayout.module.css";

type Props = {
  title: string;
  description?: string;
  /** botões/links à direita do título (opcional) */
  actions?: React.ReactNode;
};

/** Cabeçalho padrão de página: título, uma linha de contexto e ações. */
export function PageHeader({ title, description, actions }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
