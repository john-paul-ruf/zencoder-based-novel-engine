import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { markdownToDocx, markdownToPdf, Pandoc } from 'auto-pandoc';
import { mdToPdf } from 'md-to-pdf';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.dirname(__dirname);

const bookFolder = process.argv[2];
if (!bookFolder) {
  console.error('Usage: node scripts/build.js <book-folder>');
  process.exit(1);
}

const bookPath = path.join(projectRoot, 'books', bookFolder);
if (!fs.existsSync(bookPath)) {
  console.error(`✗ Book folder not found: books/${bookFolder}`);
  process.exit(1);
}

const aboutJson = JSON.parse(fs.readFileSync(path.join(bookPath, 'about.json'), 'utf-8'));
const TITLE = aboutJson.title || aboutJson.name;
const SUBTITLE = aboutJson.subtitle || '';
const AUTHOR = aboutJson.author || 'AUTHOR_NAME';
const SLUG = TITLE.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const COVER = path.join(bookPath, 'assets/cover.jpg');
const OUT_DIR = path.join(bookPath, 'dist');
const MD_OUT = path.join(OUT_DIR, `${SLUG}.md`);

// ── KDP 6×9 trim size settings ──────────────────────────────────
// KDP requires ≥0.625" gutter (inside) for 150-400 page books
// and ≥0.25" for outside, top, and bottom.
// Using 0.75" on all sides — symmetric margins avoid mirror-margin
// issues and comfortably exceed KDP minimums.
const TRIM = {
  width:  '6in',
  height: '9in',
  margin: {
    top:    '0.75in',
    bottom: '0.75in',
    left:   '0.75in',
    right:  '0.75in',
  }
};

function makeAnchor(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/ +/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractTitle(dir) {
  const draft = path.join(bookPath, 'chapters', dir, 'draft.md');
  if (!fs.existsSync(draft)) return '';

  const content = fs.readFileSync(draft, 'utf-8');
  const lines = content.split('\n');

  let label = '';
  let title = '';

  if (lines[0]?.startsWith('**') && lines[0]?.endsWith('**')) {
    label = lines[0].slice(2, -2);
  } else if (lines[0]?.startsWith('#')) {
    label = lines[0].replace(/^#+\s+/, '');
  }

  if (lines[2]?.startsWith('*') && lines[2]?.endsWith('*')) {
    title = lines[2].slice(1, -1);
  }

  return label && title ? `${label} — ${title}` : label;
}

function getPageBreak() {
  return `
\`\`\`{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
\`\`\`

\`\`\`{=latex}
\\newpage
\`\`\`

\`\`\`{=html}
<div style="page-break-before: always;"></div>
\`\`\`

`;
}

async function build() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let mdContent = '';

  if (fs.existsSync(COVER)) {
    mdContent += `![${TITLE}](${COVER})\n\n`;
  }

  if (SUBTITLE) {
    mdContent += `# ${TITLE}\n\n## ${SUBTITLE}\n\n*${AUTHOR}*\n\n---\n\n`;
  } else {
    mdContent += `# ${TITLE}\n\n*${AUTHOR}*\n\n---\n\n`;
  }

  const chaptersDir = path.join(bookPath, 'chapters');
  const chapters = fs.readdirSync(chaptersDir)
    .filter(f => fs.statSync(path.join(chaptersDir, f)).isDirectory())
    .sort();

  const tocEntries = [];
  const pageBreak = getPageBreak();

  for (const dir of chapters) {
    if (dir === 'zz-about-the-author' || dir.startsWith('_cut-')) continue;

    const partFile = path.join(chaptersDir, dir, 'part.txt');
    if (fs.existsSync(partFile)) {
      const [partTitle, partSub] = fs.readFileSync(partFile, 'utf-8').trim().split('\n');
      const anchor = makeAnchor(partTitle);

      mdContent += pageBreak;
      mdContent += `---\n\n# ${partTitle} {#${anchor}}\n\n*${partSub}*\n\n---\n\n`;

      tocEntries.push('');
      tocEntries.push(`**[${partTitle}](#${anchor})**`);
    }

    const draft = path.join(chaptersDir, dir, 'draft.md');
    if (fs.existsSync(draft)) {
      mdContent += pageBreak;

      if (!dir.startsWith('00-')) {
        const entry = extractTitle(dir);
        if (entry) {
          const anchor = makeAnchor(entry);
          tocEntries.push(`- **[${entry}](#${anchor})**`);
          mdContent += `[]{#${anchor}}\n\n`;
        }
      }

      mdContent += fs.readFileSync(draft, 'utf-8') + '\n\n';
    }
  }

  const aboutAuthor = path.join(chaptersDir, 'zz-about-the-author', 'draft.md');
  if (fs.existsSync(aboutAuthor)) {
    mdContent += pageBreak;
    mdContent += fs.readFileSync(aboutAuthor, 'utf-8') + '\n\n';
  }

  let toc = '## Contents\n\n';
  for (const entry of tocEntries) {
    toc += entry + '\n';
    if (entry) toc += '\n';
  }
  toc += '---\n\n';

  const marker = '\n---\n\n';
  const headerEndIdx = mdContent.indexOf(marker);
  const header = headerEndIdx !== -1 ? mdContent.slice(0, headerEndIdx + marker.length) : '';
  const body = mdContent.slice(header.length);

  mdContent = header + toc + body;

  fs.writeFileSync(MD_OUT, mdContent);

  const words = mdContent.split(/\s+/).length;
  console.log(`✓ Markdown built: ${MD_OUT} (${words} words)`);

  // ── DOCX (pandoc) ──────────────────────────────────────────
  try {
    const docxOut = path.join(OUT_DIR, `${SLUG}.docx`);
    let docxMd = mdContent;
    docxMd = docxMd.replace(/^[\s\S]*?\n---\n\n/, '');
    docxMd = docxMd.replace(/```{=html}[\s\S]*?```\n*/g, '');
    docxMd = docxMd.replace(
      /\[\]\{#([^}]+)\}\n\n\*\*([^*]+)\*\*\n\n\*([^*]+)\*\n\n---/g,
      (_, anchor, label, title) => `## ${label} — ${title} {#${anchor}}`
    );
    docxMd = docxMd.replace(
      /\[\]\{#([^}]+)\}\n\n\*\*([^*]+)\*\*/g,
      (_, anchor, label) => `## ${label} {#${anchor}}`
    );
    const docxFile = path.join(OUT_DIR, '.docx-temp.md');
    fs.writeFileSync(docxFile, docxMd);
    const result = await markdownToDocx(docxFile, docxOut, {
      metadata: { title: TITLE, subtitle: SUBTITLE, author: AUTHOR },
    });
    fs.unlinkSync(docxFile);
    if (result.success) {
      console.log(`✓ Word built:     ${docxOut}`);
    } else {
      console.warn(`⚠ DOCX generation failed: ${result.error}`);
    }
  } catch (err) {
    console.warn(`⚠ DOCX generation failed: ${err.message}`);
  }

  // ── EPUB (reflowable — no page size needed) ─────────────────
  try {
    const epubOut = path.join(OUT_DIR, `${SLUG}.epub`);
    let epubMd = mdContent;
    epubMd = epubMd.replace(/^[\s\S]*?\n---\n\n/, '');
    epubMd = epubMd.replace(/^!\[.*\]\(assets\/cover\.jpg\)$/gm, '');
    epubMd = epubMd.replace(/```{=openxml}[\s\S]*?```\n*/g, '');
    epubMd = epubMd.replace(/```{=latex}[\s\S]*?```\n*/g, '');
    epubMd = epubMd.replace(/^## Contents\n[\s\S]*?^---$/m, '');

    epubMd = epubMd.replace(/```{=html}[\s\S]*?```\n*/g, '');

    epubMd = epubMd.replace(
      /\[\]\{#([^}]+)\}\n\n\*\*([^*]+)\*\*\n\n\*([^*]+)\*\n\n---/g,
      (_, anchor, label, title) => `## ${label} — ${title} {#${anchor}}`
    );
    epubMd = epubMd.replace(
      /\[\]\{#([^}]+)\}\n\n\*\*([^*]+)\*\*/g,
      (_, anchor, label) => `## ${label} {#${anchor}}`
    );

    epubMd = epubMd.trimStart();
    if (!epubMd.startsWith('#')) {
      epubMd = '# Copyright {.unnumbered .unlisted}\n\n' + epubMd;
    }

    const yamlHeader = SUBTITLE
      ? `---\ntitle: "${TITLE}"\nsubtitle: "${SUBTITLE}"\nauthor: ${AUTHOR}\nlang: en\n---\n\n`
      : `---\ntitle: "${TITLE}"\nauthor: ${AUTHOR}\nlang: en\n---\n\n`;
    const epubFile = path.join(OUT_DIR, '.epub-temp.md');
    fs.writeFileSync(epubFile, yamlHeader + epubMd);

    const pandocBin = await Pandoc.getBinaryPath();
    const coverArgs = fs.existsSync(COVER) ? `--epub-cover-image="${COVER}"` : '';
    execSync(`"${pandocBin}" "${epubFile}" -o "${epubOut}" --toc --toc-depth=2 --split-level=2 ${coverArgs}`, { stdio: 'pipe' });
    const result = { success: true };
    fs.unlinkSync(epubFile);
    
    if (result.success) {
      console.log(`✓ EPUB built:     ${epubOut}`);
    } else {
      console.warn(`⚠ EPUB generation failed: ${result.error}`);
    }
  } catch (err) {
    console.warn(`⚠ EPUB generation failed: ${err.message}`);
  }

  // ── PDF (pandoc+LaTeX primary, md-to-pdf fallback) ─────────
  const pdfOut = path.join(OUT_DIR, `${SLUG}.pdf`);
  let pdfBuilt = false;

  try {
    let pandocPdfMd = mdContent;
    pandocPdfMd = pandocPdfMd.replace(/^[\s\S]*?\n---\n\n/, '');
    pandocPdfMd = pandocPdfMd.replace(/```{=html}[\s\S]*?```\n*/g, '');
    pandocPdfMd = pandocPdfMd.replace(/^\[\]{#[^}]*}\n*/gm, '');
    pandocPdfMd = pandocPdfMd.replace(/^!\[.*\]\(assets\/cover\.jpg\)$/gm, '');
    pandocPdfMd = pandocPdfMd.replace(/^## Contents\n[\s\S]*?^---$/m, '');
    pandocPdfMd = pandocPdfMd.replace(
      /\[\]\{#([^}]+)\}\n\n\*\*([^*]+)\*\*\n\n\*([^*]+)\*\n\n---/g,
      (_, anchor, label, title) => `## ${label} — ${title} {#${anchor}}`
    );
    pandocPdfMd = pandocPdfMd.replace(
      /\[\]\{#([^}]+)\}\n\n\*\*([^*]+)\*\*/g,
      (_, anchor, label) => `## ${label} {#${anchor}}`
    );

    const pdfTempFile = path.join(OUT_DIR, '.pdf-temp.md');
    fs.writeFileSync(pdfTempFile, pandocPdfMd);

    for (const engine of ['xelatex', 'lualatex', 'pdflatex']) {
      const result = await markdownToPdf(pdfTempFile, pdfOut, {
        pdfEngine: engine,
        toc: true,
        tocDepth: 2,
        metadata: { title: TITLE, subtitle: SUBTITLE, author: AUTHOR },
        variables: {
          'geometry:paperwidth': TRIM.width,
          'geometry:paperheight': TRIM.height,
          'geometry:top': TRIM.margin.top,
          'geometry:bottom': TRIM.margin.bottom,
          'geometry:left': TRIM.margin.left,
          'geometry:right': TRIM.margin.right,
          fontsize: '11pt',
          mainfont: 'Crimson Text',
        },
      });
      if (result.success) {
        console.log(`✓ PDF built:      ${pdfOut} (${engine})`);
        pdfBuilt = true;
        break;
      }
    }
    fs.unlinkSync(pdfTempFile);
  } catch (err) {
    console.warn(`⚠ Pandoc PDF failed: ${err.message}`);
  }

  if (!pdfBuilt) {
    try {
      let pdfMd = mdContent;
      pdfMd = pdfMd.replace(/^[\s\S]*?\n---\n\n/, '');
      pdfMd = pdfMd.replace(/```{=openxml}[\s\S]*?```\n*```{=latex}[\s\S]*?```\n*```{=html}[\s\S]*?```\n*/g, '<div style="page-break-before: always;"></div>\n\n');
      pdfMd = pdfMd.replace(/^\[\]{#[^}]*}\n*/gm, '');
      pdfMd = pdfMd.replace(/^!\[.*\]\(assets\/cover\.jpg\)$/gm, '');
      pdfMd = pdfMd.replace(/^## Contents\n[\s\S]*?^---$/m, '');

      const fullPdfTitle = SUBTITLE ? `${TITLE}: ${SUBTITLE}` : TITLE;
      const pdf = await mdToPdf(
        { content: pdfMd },
        {
          document_title: fullPdfTitle,
          stylesheet: ['https://fonts.googleapis.com/css2?family=Crimson+Text:ital@0;1&display=swap'],
          css: 'body { font-family: "Crimson Text", serif; }',
          pdf_options: {
            width:  TRIM.width,
            height: TRIM.height,
            margin: {
              top:    TRIM.margin.top,
              bottom: TRIM.margin.bottom,
              left:   TRIM.margin.left,
              right:  TRIM.margin.right,
            },
          },
        },
      );
      fs.writeFileSync(pdfOut, pdf.content);
      console.log(`✓ PDF built:      ${pdfOut} (md-to-pdf fallback — no bookmarks)`);
    } catch (err) {
      console.warn(`⚠ PDF generation failed: ${err.message}`);
    }
  }
}

build().catch(err => {
  console.error('✗ Build failed:', err.message);
  process.exit(1);
});
