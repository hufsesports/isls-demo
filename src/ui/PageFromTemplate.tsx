import React, { useMemo } from 'react';

function extract(html: string, selector: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const node = doc.querySelector(selector);
  if (!node) return `<div class="container"><div class="card"><h3>Template parse error</h3><p class="meta">Selector not found: ${selector}</p></div></div>`;

  // Remove any in-template bottom tabbar to avoid duplicates.
  node.querySelectorAll('.tabbar').forEach((el) => el.remove());

  // Fix any hardcoded links (home.html etc.) into SPA routes.
  node.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const map: Record<string, string> = {
      'home.html': '#/home',
      'lms.html': '#/lms',
      'output.html': '#/output',
      'mentoring.html': '#/mentoring',
      'alumni.html': '#/alumni',
      'coach.html': '#/coach',
      'admin.html': '#/admin'
    };
    if (map[href]) a.setAttribute('href', map[href]);
  });

  return node.innerHTML;
}

export default function PageFromTemplate({ html, selector }: { html: string; selector: string }) {
  const content = useMemo(() => extract(html, selector), [html, selector]);
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
