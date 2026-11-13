"""Registration-matched Commons photos with explicit reusable license metadata."""
import re
from html.parser import HTMLParser
from urllib.parse import urlencode, urlparse
from fastapi import HTTPException
from providers import cached_json


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def plain(value):
    parser = PlainText()
    parser.feed(str(value))
    return ' '.join(''.join(parser.parts).split())[:500]


def safe_url(value, hosts):
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme == 'https' and parsed.hostname in hosts and not parsed.username and not parsed.password


def select_photo(data, registration):
    if not isinstance(data, dict) or 'error' in data:
        raise HTTPException(502, 'Invalid photo response')
    pages = data.get('query', {}).get('pages', {})
    for page in sorted(pages.values(), key=lambda p: p.get('index', 999)):
        title = page.get('title', '')
        if not re.search(r'(?<![A-Z0-9])' + re.escape(registration) + r'(?![A-Z0-9])', title.upper()):
            continue
        for info in page.get('imageinfo', []):
            metadata = info.get('extmetadata', {})
            def field(name):
                return metadata.get(name, {}).get('value', '')
            # A registration alone also matches cabin views, meals and scenery.
            # Require an aircraft description and reject known non-exterior subjects.
            description = plain(field('ImageDescription'))
            categories = plain(field('Categories'))
            subject = f'{title} {description} {categories}'.lower()
            excluded = r'\b(interior|cabin|cockpit|flight deck|seat|seats|meal|food|lavatory|toilet|lounge|terminal|boarding pass|safety card|wing view|view from|through the window|aus dem fenster|kabine|innenraum|bordverpflegung)\b'
            aircraft_subject = r'\b(airbus|boeing|embraer|bombardier|cessna|piper|pilatus|gulfstream|dassault|fokker|atr|de havilland|aircraft|airplane|aeroplane|flugzeug)\b'
            if re.search(excluded, subject) or not re.search(aircraft_subject, f'{title} {description}'.lower()):
                continue
            license_code = field('License').lower()
            if not (license_code.startswith(('cc-by-', 'cc-by-sa-')) or license_code in ('cc0', 'pd')):
                continue
            url, page_url, license_url = info.get('thumburl'), info.get('descriptionurl'), field('LicenseUrl')
            if not (safe_url(url, ('upload.wikimedia.org', 'thumb.wikimedia.org'))
                    and safe_url(page_url, ('commons.wikimedia.org',))
                    and safe_url(license_url, ('creativecommons.org',))):
                continue
            author, license_name = plain(field('Artist')), plain(field('LicenseShortName'))
            if not author or not license_name or field('Restrictions'):
                continue
            return dict(url=url, pageUrl=page_url, author=author, license=license_name,
                        licenseUrl=license_url, title=title, date=plain(field('DateTimeOriginal')))
    return None


async def aircraft_photo(registration):
    query = urlencode(dict(action='query', generator='search', gsrsearch=f'intitle:{registration} filetype:bitmap -intitle:interior -intitle:cabin -intitle:cockpit',
                           gsrnamespace=6, gsrlimit=10, prop='imageinfo', iiprop='url|extmetadata',
                           iiurlwidth=600, format='json'))
    data = await cached_json('https://commons.wikimedia.org/w/api.php?' + query, ttl=86400)
    return {'registration': registration, 'photo': select_photo(data, registration)}
