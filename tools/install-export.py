#!/usr/bin/env python3
"""Check a new Claude Design export and install it in place of the current one, keeping the old one as a backup.

  install-export.py <export folder or .zip> --name <label> [--expect <folder or fingerprints.json>] [--install] [--force]

Without --install it only checks and reports: which canonical files changed, were added or were removed, and
whether the export matches what you expected. With --install it renames the current design folder to
<backups>/Design-before-<label> (an instant move, so nothing is copied twice and the backup is the old folder
exactly), copies the export into its place, and checks every file byte for byte.

--expect takes either a folder holding the result you verified locally (every .dc.html in it must match the
export byte for byte; run-pack-local.mjs leaves one) or a pack's fingerprints.json ("files": {code: {"after"}}) or
an expected-census.json ("files": [{file, sha256}]). A mismatch stops --install unless --force is given.

Folders: DESIGN_DIR (else ./Design) and DESIGN_BACKUPS (else a design-backups folder beside the design folder).
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


def sha(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def code(name):
    return re.split(r'[ ·_-]', name[:-len('.dc.html')], maxsplit=1)[0]


def files_under(root):
    return {p.relative_to(root).as_posix(): p for p in root.rglob('*') if p.is_file()}


def safe_extract(archive, target):
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename:
                sys.exit(f'Unsafe path in archive: {entry.filename}')
            if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                sys.exit(f'Symlink in archive: {entry.filename}')
        bad = z.testzip()
        if bad:
            sys.exit(f'CRC failure in archive: {bad}')
        z.extractall(target)
    # An archive that holds one folder holds the export inside it.
    entries = [p for p in target.iterdir() if not p.name.startswith('__MACOSX')]
    if len(entries) == 1 and entries[0].is_dir() and not list(target.glob('*.dc.html')):
        return entries[0]
    return target


def expectation(source, export_pages):
    """Returns {file name: expected sha256} from a verified folder or a fingerprints file."""
    if source.is_dir():
        return {p.name: sha(p) for p in source.glob('*.dc.html')}
    data = json.loads(source.read_text(encoding='utf-8'))
    files = data.get('files')
    if isinstance(files, list):
        return {row['file']: row['sha256'] for row in files}
    by_code = {code(name): name for name in export_pages}
    return {by_code.get(c, c): row['after'] for c, row in files.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('export', type=Path)
    parser.add_argument('--name', required=True, help='label for the backup, e.g. pack-3')
    parser.add_argument('--expect', type=Path)
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    design = Path(os.environ.get('DESIGN_DIR') or Path.cwd() / 'Design').resolve()
    backups = Path(os.environ.get('DESIGN_BACKUPS') or design.parent / 'design-backups').resolve()
    if not re.fullmatch(r'[A-Za-z0-9.-]+', args.name):
        sys.exit('--name takes letters, digits, dots and hyphens only')
    backup = backups / f'Design-before-{args.name}'

    source = args.export.resolve(strict=True)
    if source.is_file():
        backups.mkdir(parents=True, exist_ok=True)
        staging = Path(tempfile.mkdtemp(prefix='export-', dir=backups))
        try:
            install(args, design, backup, backups, safe_extract(source, staging))
        finally:
            shutil.rmtree(staging)
    else:
        install(args, design, backup, backups, source)


def install(args, design, backup, backups, source):
    if any(p.is_symlink() for p in source.rglob('*')):
        sys.exit('The export contains a symlink; refusing it.')

    pages = sorted(p.name for p in source.glob('*.dc.html'))
    if not pages:
        sys.exit(f'No .dc.html files at the top of {source}.')
    for name in pages:
        data = (source / name).read_bytes()
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            sys.exit(f'{name} is not UTF-8.')
        if len(data) < 100 or '<html' not in text[:2000].lower():
            sys.exit(f'{name} does not look like an HTML design file.')

    current = {p.name for p in design.glob('*.dc.html')} if design.is_dir() else set()
    changed = [n for n in pages if n in current and sha(source / n) != sha(design / n)]
    added = [n for n in pages if n not in current]
    removed = sorted(current - set(pages))
    report = {'export': str(source), 'pages': len(pages), 'changed': [code(n) for n in changed],
              'added': added, 'removed': removed}

    mismatched = []
    if args.expect:
        wanted = expectation(args.expect.resolve(strict=True), set(pages))
        for name, digest in sorted(wanted.items()):
            if name not in pages:
                mismatched.append(f'{name} (missing from the export)')
            elif sha(source / name) != digest:
                mismatched.append(code(name))
        report['expected'] = len(wanted)
        report['mismatched'] = mismatched
    print(json.dumps(report, ensure_ascii=False, indent=1))

    if not args.install:
        print('Checked only. Add --install to install.')
    elif mismatched and not args.force:
        sys.exit('Not installed: the export differs from what was expected (see mismatched). Use --force to install anyway.')
    elif backup.exists():
        sys.exit(f'{backup} already exists; choose another --name.')
    else:
        backups.mkdir(parents=True, exist_ok=True)
        if design.exists():
            design.rename(backup)
        try:
            shutil.copytree(source, design, symlinks=False)
        except Exception:
            if design.exists():
                shutil.rmtree(design)
            if backup.exists():
                backup.rename(design)
            raise
        wrong = [rel for rel, path in files_under(source).items()
                 if not (design / rel).is_file() or sha(path) != sha(design / rel)]
        if wrong:
            sys.exit(f'Installed, but {len(wrong)} files differ from the export: {wrong[:20]}')
        print(f'Installed {len(pages)} design files into {design}; the previous folder is {backup}.')


if __name__ == '__main__':
    main()
