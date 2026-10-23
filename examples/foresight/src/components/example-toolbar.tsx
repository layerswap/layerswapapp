import { ArrowUpRight, Code2 } from 'lucide-react';
import styles from './example-toolbar.module.css';

export default function ExampleToolbar() {
  return (
    <aside className={styles.toolbar} aria-label="Layerswap example">
      <div className={styles.identity}>
        <a
          className={styles.brand}
          href="https://layerswap.io"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Layerswap home (opens in a new tab)"
        >
          <svg width="25" height="25" viewBox="0 0 77 77" fill="#FF3272" aria-hidden="true">
            <rect x="10.28" y="10.28" width="55.63" height="55.63" rx="5.24" opacity=".6" />
            <rect x="20.56" y="20.56" width="55.63" height="55.63" rx="5.24" opacity=".5" />
            <rect width="55.63" height="55.63" rx="5.24" opacity=".9" />
          </svg>
          <span>Layerswap</span>
        </a>
        <span className={styles.badge}>Example</span>
      </div>

      <p className={styles.title}>
        <strong>Foresight</strong>
        <span className={styles.description}>Prediction market demo</span>
      </p>

      <nav className={styles.links} aria-label="Example resources">
        <a
          className={styles.sourceLink}
          href="https://github.com/layerswap/layerswapapp/tree/dev/examples/foresight"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Foresight source code (opens in a new tab)"
        >
          <Code2 size={16} aria-hidden="true" />
          <span>View code</span>
        </a>
        <a
          className={styles.docsLink}
          href="https://docs.layerswap.io/widget/deposit-widget"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Layerswap deposit widget documentation (opens in a new tab)"
        >
          <span>Docs</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </nav>
    </aside>
  );
}
