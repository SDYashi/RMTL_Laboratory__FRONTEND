import { removePdfCellBackgroundColors } from './pdf-report-style.util';

describe('removePdfCellBackgroundColors', () => {
  it('removes nested cell, style, and layout fill colors', () => {
    const doc: any = {
      styles: { header: { bold: true, fillColor: '#eeeeee' } },
      content: [{
        table: {
          body: [[{ text: 'Header', fillColor: '#dddddd' }]]
        },
        layout: {
          fillColor: () => '#fafafa'
        }
      }]
    };

    removePdfCellBackgroundColors(doc);

    expect(doc.styles.header.fillColor).toBeUndefined();
    expect(doc.content[0].table.body[0][0].fillColor).toBeUndefined();
    expect(doc.content[0].layout.fillColor).toBeUndefined();
  });

  it('changes white text to black after backgrounds are removed', () => {
    const doc: any = {
      content: [{ text: 'PASS', color: '#ffffff', fillColor: '#2e7d32' }]
    };

    removePdfCellBackgroundColors(doc);

    expect(doc.content[0].fillColor).toBeUndefined();
    expect(doc.content[0].color).toBe('#000000');
  });
});
