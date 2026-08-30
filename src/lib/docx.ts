import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';

import { getTemplate } from './templates';
import type { Resume, ThemeSettings } from './types';

/** Word measures in half-points; the renderer works in points. */
const halfPoints = (pt: number) => Math.round(pt * 2);
/** Twentieths of a point, used for spacing and tab stops. */
const twips = (pt: number) => Math.round(pt * 20);

const PAGE_CONTENT_WIDTH_TWIPS = 9360; // Letter width minus 0.5in margins.

function hexColor(value: string): string {
  return value.replace('#', '').toUpperCase();
}

function sectionHeading(
  text: string,
  theme: ThemeSettings,
  baseFontPt: number
): Paragraph {
  return new Paragraph({
    spacing: {
      before: twips(10 * theme.density),
      after: twips(3 * theme.density),
    },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: 'C9CED6',
        space: 2,
      },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: halfPoints(baseFontPt * 0.85),
        color: hexColor(theme.accentColor),
        characterSpacing: 20,
      }),
    ],
  });
}

/**
 * Title on the left, dates right-aligned on the same line — matches the
 * PDF layout without using a table, which keeps ATS parsers happy.
 */
function titleWithDates(
  left: TextRun[],
  right: string,
  baseFontPt: number
): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: PAGE_CONTENT_WIDTH_TWIPS }],
    spacing: { before: twips(5) },
    children: right
      ? [
          ...left,
          new TextRun({ text: '\t' }),
          new TextRun({
            text: right,
            size: halfPoints(baseFontPt * 0.9),
            color: '6B7280',
          }),
        ]
      : left,
  });
}

export async function buildDocxBlob(
  resume: Resume,
  theme: ThemeSettings
): Promise<Blob> {
  const template = getTemplate(theme.templateId);
  const baseFontPt = template.baseFontPt * theme.fontScale;
  const fontName = theme.fontFamily === 'serif' ? 'Georgia' : 'Calibri';

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment:
        template.headerAlign === 'center'
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
      spacing: { after: twips(2) },
      children: [
        new TextRun({
          text: resume.name || 'Your Name',
          bold: true,
          size: halfPoints(baseFontPt * 1.95),
          color: hexColor(theme.accentColor),
        }),
      ],
    })
  );

  if (resume.headline) {
    children.push(
      new Paragraph({
        alignment:
          template.headerAlign === 'center'
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: resume.headline,
            size: halfPoints(baseFontPt * 1.05),
            color: '454C56',
          }),
        ],
      })
    );
  }

  const contactRuns: (TextRun | ExternalHyperlink)[] = [];
  const pushContact = (child: TextRun | ExternalHyperlink) => {
    if (contactRuns.length > 0) {
      contactRuns.push(
        new TextRun({
          text: '  •  ',
          size: halfPoints(baseFontPt * 0.9),
          color: '9CA3AF',
        })
      );
    }
    contactRuns.push(child);
  };

  const contactRun = (text: string) =>
    new TextRun({
      text,
      size: halfPoints(baseFontPt * 0.9),
      color: '4B5563',
    });

  if (resume.contact.email) {
    pushContact(
      new ExternalHyperlink({
        link: `mailto:${resume.contact.email}`,
        children: [contactRun(resume.contact.email)],
      })
    );
  }
  if (resume.contact.phone) pushContact(contactRun(resume.contact.phone));
  if (resume.contact.location) pushContact(contactRun(resume.contact.location));
  if (resume.contact.linkedin) pushContact(contactRun(resume.contact.linkedin));
  if (resume.contact.website) pushContact(contactRun(resume.contact.website));

  if (contactRuns.length > 0) {
    children.push(
      new Paragraph({
        alignment:
          template.headerAlign === 'center'
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        spacing: { before: twips(3) },
        children: contactRuns,
      })
    );
  }

  if (resume.summary) {
    children.push(sectionHeading('Summary', theme, baseFontPt));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: resume.summary })],
      })
    );
  }

  const experience = resume.experience.filter((e) => e.title || e.company);
  if (experience.length > 0) {
    children.push(sectionHeading('Experience', theme, baseFontPt));

    for (const exp of experience) {
      children.push(
        titleWithDates(
          [new TextRun({ text: exp.title || exp.company, bold: true })],
          exp.duration,
          baseFontPt
        )
      );

      const subParts = [exp.title ? exp.company : '', exp.location].filter(
        Boolean
      );
      if (subParts.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: subParts.join(' · '), color: '4B5563' }),
            ],
          })
        );
      }

      for (const bullet of exp.bullets.filter((b) => b.trim())) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: twips(2) },
            children: [new TextRun({ text: bullet })],
          })
        );
      }
    }
  }

  const education = resume.education.filter((e) => e.school || e.degree);
  if (education.length > 0) {
    children.push(sectionHeading('Education', theme, baseFontPt));

    for (const edu of education) {
      children.push(
        titleWithDates(
          [new TextRun({ text: edu.school || edu.degree, bold: true })],
          edu.duration,
          baseFontPt
        )
      );

      if (edu.school && edu.degree) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: edu.degree, color: '4B5563' })],
          })
        );
      }
    }
  }

  const skills = resume.skills.filter((s) => s.trim());
  if (skills.length > 0) {
    children.push(sectionHeading('Skills', theme, baseFontPt));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: skills.join(' · ') })],
      })
    );
  }

  const doc = new Document({
    creator: 'ResumeForge',
    title: resume.name ? `${resume.name} — Resume` : 'Resume',
    description: 'Generated by ResumeForge',
    styles: {
      default: {
        document: {
          run: { font: fontName, size: halfPoints(baseFontPt) },
          paragraph: { spacing: { line: Math.round(240 * 1.15) } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: twips(36),
              bottom: twips(36),
              left: twips(36),
              right: twips(36),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
