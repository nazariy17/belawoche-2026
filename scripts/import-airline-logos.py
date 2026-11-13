"""Import selected Commons logo thumbnails with their individual source metadata."""
import json
from pathlib import Path
import httpx

FILES = {'SWR': 'Swiss International Air Lines Logo 2011.svg', 'DLH': 'Lufthansa Logo (Crane).svg',
         'EZY': 'EasyJet logo.svg', 'BAW': 'BRITISH AIRWAYS logo.svg',
         'EDW': 'Edelweiss Air wordmark.svg', 'UAE': 'Emirates logo.svg'}
root = Path(__file__).resolve().parents[1] / 'frontend/public/icons/airlines'
root.mkdir(parents=True, exist_ok=True)
credits = {}
with httpx.Client(headers={'User-Agent': 'EwanFlightRadar/0.1 (+https://github.com/nazariy17/belawoche-2026)'}, timeout=30, follow_redirects=True) as client:
    for code, title in FILES.items():
        response = client.get('https://commons.wikimedia.org/w/api.php', params=dict(action='query', titles='File:' + title, prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=160, format='json'))
        response.raise_for_status()
        page = next(iter(response.json()['query']['pages'].values()))
        info = page['imageinfo'][0]
        metadata = info['extmetadata']
        license_code = metadata.get('License', {}).get('value', '')
        if license_code not in ('pd', 'cc0') and not license_code.startswith(('cc-by-', 'cc-by-sa-')):
            print(code, 'unsupported license', license_code)
            continue
        image = client.get(info['thumburl'])
        image.raise_for_status()
        if 'image/png' not in image.headers.get('content-type', ''):
            raise ValueError('Expected PNG thumbnail')
        (root / f'{code}.png').write_bytes(image.content)
        credits[code] = dict(title=title, page=info['descriptionurl'], metadata=metadata)
        print(code, license_code, len(image.content))
(root / 'sources.json').write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding='utf-8')
