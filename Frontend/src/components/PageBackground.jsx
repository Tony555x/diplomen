import React from "react";
import styles from "./PageBackground.module.css";

/**
 * Shared animated blob background.
 * Drop this inside any page's root element (position: relative / overflow-x: hidden).
 */
export default function PageBackground() {
  return <div className={styles.background} aria-hidden="true" />;
}
