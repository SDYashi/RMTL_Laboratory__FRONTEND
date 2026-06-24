/**
 * Removes pdfMake table/cell background colors from a document definition.
 *
 * Report definitions are composed from nested arrays, styles, table layouts,
 * and helper-generated objects. Walking the final document once keeps every
 * PDF report consistent without requiring each table helper to repeat the
 * same no-background rule.
 */
export function removePdfCellBackgroundColors<T>(doc: T): T {
  const visited = new WeakSet<object>();

  const walk = (value: any): void => {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);

    if (Object.prototype.hasOwnProperty.call(value, 'fillColor')) {
      delete value.fillColor;
    }

    // White badge text becomes unreadable after its colored cell background
    // is removed. Normalize it to black while leaving all other text colors.
    if (typeof value.color === 'string') {
      const textColor = value.color.trim().toLowerCase();
      if (textColor === '#fff' || textColor === '#ffffff' || textColor === 'white') {
        value.color = '#000000';
      }
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    Object.keys(value).forEach(key => walk(value[key]));
  };

  walk(doc);
  return doc;
}
