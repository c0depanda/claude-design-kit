#!/usr/bin/env python3
"""Read a Claude Design export without opening multi-megabyte HTML.

  design.py files                      every design file, with its frame count
  design.py outline <file>             section headings, notes and frame captions, in page order
  design.py labels  <file> [regex]     frame id and label, optionally filtered by either
  design.py text    <file> <regex>     visible text of every frame whose id or label matches
  design.py find    <file|all> <regex> frames and notes whose visible text matches, with context
  design.py links   <file> <regex>     where each control in the matching frames leads (prototype flow)
  design.py check   <file|all>         duplicate frame ids and labels, and links that resolve to no frame

<file> is a design file's code: its name up to the first space, middle dot, hyphen or underscore
(P1 for "P1 Payments.dc.html", P1a, F1d), or its full file name. It must match one file.
Regexes are Python regexes, case-insensitive.

The export is read from DESIGN_DIR, else ./Design under the current folder.
"""
import glob
import os
import re
import sys
import urllib.parse
from html.parser import HTMLParser

DESIGN = os.path.abspath(os.environ.get('DESIGN_DIR') or os.path.join(os.getcwd(), 'Design'))
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
BLOCK = {'p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'button', 'label', 'tr', 'section'}
INLINE = {'span', 'a', 'td', 'th', 'dt', 'dd'}
HIDDEN = {'script', 'style', 'template', 'svg'}


def tidy(chunks):
    text = re.sub(r'[ \t]+', ' ', ''.join(chunks))
    return re.sub(r'\s*\n\s*', '\n', text).strip()


class Design(HTMLParser):
    """Collects each frame ([data-screen-label]) and the text outside frames (notes and captions)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.hidden = 0
        self.open = []  # frames being read: {id, label, depth, chunks, links}
        self.frames = []
        self.notes = []  # text outside every frame, in page order
        self.link = None  # [href, chunks] for the <a> being read

    def handle_starttag(self, tag, attrs):
        if tag in HIDDEN:
            self.hidden += 1
        if tag in VOID:
            return
        self.depth += 1
        attrs = dict(attrs)
        if attrs.get('data-screen-label'):
            self.open.append({'id': attrs.get('id') or '', 'label': attrs['data-screen-label'], 'depth': self.depth,
                              'chunks': [], 'links': []})
        if tag == 'a' and attrs.get('href'):
            self.link = [urllib.parse.unquote(attrs['href']), [], self.depth]
        if tag in BLOCK or tag in INLINE:
            gap = '\n' if tag in BLOCK else ' '
            for frame in self.open:
                frame['chunks'].append(gap)
            if not self.open:
                self.notes.append(gap)

    def handle_endtag(self, tag):
        if tag in HIDDEN:
            self.hidden = max(0, self.hidden - 1)
        if tag in VOID:
            return
        if self.link and self.link[2] == self.depth:
            href, chunks, _ = self.link
            if self.open:
                self.open[-1]['links'].append((tidy(chunks).replace('\n', ' ') or '(no text)', href))
            self.link = None
        if self.open and self.open[-1]['depth'] == self.depth:
            frame = self.open.pop()
            frame['text'] = tidy(frame['chunks'])
            self.frames.append(frame)
        self.depth -= 1

    def handle_data(self, data):
        if self.hidden:
            return
        for frame in self.open:
            frame['chunks'].append(data)
        if not self.open:
            self.notes.append(data)
        if self.link:
            self.link[1].append(data)


def design_files():
    files = sorted(f for f in glob.glob(os.path.join(DESIGN, '*.dc.html')))
    if not files:
        sys.exit(f'No *.dc.html files in {DESIGN}. Set DESIGN_DIR to the folder of the Claude Design export.')
    return files


def code(path):
    """A file's code: its name up to the first space, middle dot, hyphen or underscore ('P1 Payments' -> 'P1')."""
    return re.split(r'[ ·_-]', os.path.basename(path)[:-len('.dc.html')], maxsplit=1)[0]


def resolve(prefix):
    files = design_files()
    matches = [f for f in files if os.path.basename(f) == prefix] or [f for f in files if code(f) == prefix]
    if len(matches) != 1:
        sys.exit(f'{prefix!r} matches {len(matches)} design files; use the file\'s code (P1, P1a) or its full name')
    return matches[0]


def parse(path):
    design = Design()
    with open(path, encoding='utf-8', errors='ignore') as handle:
        design.feed(handle.read())
    return design


ID = re.compile(r'\sid\s*=\s*"([^"]+)"')
LABEL = re.compile(r'data-screen-label\s*=\s*"([^"]*)"')
HREF = re.compile(r'\shref\s*=\s*"([^"]*#[^"]*)"')
RETIRED = re.compile(r'data-retired-to\s*=\s*"([^"]+)"')


OPAQUE = re.compile(r'<!--.*?-->|<(script|style|template)\b[^>]*>.*?</\1\s*>', re.S | re.I)


def read(path):
    """The file's markup without comments, scripts, styles and templates, which hold no frames or links."""
    with open(path, encoding='utf-8', errors='ignore') as handle:
        return OPAQUE.sub('', handle.read())


def check(paths):
    """Every id and label once per file, and every link (href="#id" or "<file>.dc.html#id") lands on an element."""
    ids = {}

    def ids_of(name):
        if name not in ids:
            path = os.path.join(DESIGN, name)
            ids[name] = set(ID.findall(read(path))) if os.path.exists(path) else None
        return ids[name]

    problems = 0
    for path in paths:
        name = os.path.basename(path)
        text = read(path)
        found = []
        for kind, values in (('id', ID.findall(text)), ('label', LABEL.findall(text))):
            seen = set()
            for value in values:
                if value in seen:
                    found.append(f'duplicate {kind}: {value}')
                seen.add(value)
        own = ids_of(name)
        links = HREF.findall(text)
        for href in links:
            target, _, fragment = urllib.parse.unquote(href).partition('#')
            file_ids = ids_of(os.path.basename(target)) if target else own
            if not fragment:
                found.append(f'link to nothing: {href}')
            elif file_ids is None:
                found.append(f'link to a missing file: {href}')
            elif fragment not in file_ids:
                found.append(f'link to a missing frame: {href}')
        for target in RETIRED.findall(text):
            if target not in own:
                found.append(f'retired anchor points to a missing frame: {target}')
        print(f'# {name}: {len(LABEL.findall(text))} frames, {len(links)} links, {len(found)} problems')
        for line in sorted(set(found)):
            print(f'  {line}')
        problems += len(found)
    if problems:
        sys.exit(1)


def frame_name(frame):
    return f"{frame['id']} | {frame['label']}" if frame['id'] else frame['label']


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
        sys.exit(__doc__)
    mode = sys.argv[1]
    if mode == 'files':
        for path in design_files():
            with open(path, encoding='utf-8', errors='ignore') as handle:
                count = handle.read().count('data-screen-label=')
            print(f'{count:4} frames  {os.path.basename(path)}')
        return
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    target = sys.argv[2]
    if mode == 'check':
        check(design_files() if target == 'all' else [resolve(target)])
        return
    pattern = re.compile(sys.argv[3], re.I) if len(sys.argv) > 3 else None
    if mode in ('text', 'find', 'links') and not pattern:
        sys.exit(f'{mode} needs a regex')
    paths = design_files() if mode == 'find' and target == 'all' else [resolve(target)]
    for path in paths:
        design = parse(path)
        name = os.path.basename(path)
        if mode == 'outline':
            print(f'# {name}\n{tidy(design.notes)}')
        elif mode == 'labels':
            print(f'# {name}')
            for frame in design.frames:
                if not pattern or pattern.search(frame['label']) or pattern.search(frame['id']):
                    print(frame_name(frame))
        elif mode == 'text':
            print(f'# {name}')
            for frame in design.frames:
                if pattern.search(frame['label']) or pattern.search(frame['id']):
                    print(f"\n=== {frame_name(frame)}\n{frame['text']}")
        elif mode == 'links':
            print(f'# {name}')
            for frame in design.frames:
                if pattern.search(frame['label']) or pattern.search(frame['id']):
                    print(f'\n=== {frame_name(frame)}')
                    for text, href in frame['links']:
                        print(f'  {text[:80]} -> {href}')
        elif mode == 'find':
            hits = []
            for frame in design.frames:
                for match in pattern.finditer(frame['text']):
                    hits.append((frame_name(frame), frame['text'], match))
            notes = tidy(design.notes)
            for match in pattern.finditer(notes):
                hits.append(('notes', notes, match))
            if hits:
                print(f'# {name}')
            for where, text, match in hits:
                start, end = max(0, match.start() - 120), min(len(text), match.end() + 120)
                print(f"[{where}] …{text[start:end]}…".replace('\n', ' / '))
        else:
            sys.exit(__doc__)


if __name__ == '__main__':
    main()
