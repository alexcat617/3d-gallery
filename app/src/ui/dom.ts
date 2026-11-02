type Child = Node | string | null | undefined | false;

type Attrs = Record<string, string | number | boolean | undefined | ((event: MouseEvent) => void)>;

/** Tiny element builder. Text goes through text nodes, never innerHTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'onClick' && typeof value === 'function') {
      node.addEventListener('click', value as (event: Event) => void);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else if (value !== false && value !== undefined) {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}
