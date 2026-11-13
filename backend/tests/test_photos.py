import asyncio
from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from main import app
from photos import select_photo, aircraft_photo


def sample(title='File:Bombardier CS300 HB-JCA at Zurich.jpg'):
    info = {'thumburl': 'https://upload.wikimedia.org/photo.jpg',
            'descriptionurl': 'https://commons.wikimedia.org/wiki/File:HB-JCA.jpg',
            'extmetadata': {key: {'value': value} for key, value in {
                'Artist': '<a href="https://example.com">A Photographer</a>',
                'License': 'cc-by-sa-4.0', 'LicenseShortName': 'CC BY-SA 4.0',
                'LicenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/',
            }.items()}}
    return {'query': {'pages': {'1': {'title': title, 'imageinfo': [info]}}}}


def test_registration_match_and_plain_attribution():
    photo = select_photo(sample(), 'HB-JCA')
    assert photo['author'] == 'A Photographer'
    assert photo['license'] == 'CC BY-SA 4.0'
    assert select_photo(sample('File:HB-JCAA.jpg'), 'HB-JCA') is None
    assert select_photo({}, 'HB-JCA') is None


def test_reject_unknown_license_and_unsafe_urls():
    data = sample()
    info = data['query']['pages']['1']['imageinfo'][0]
    info['thumburl'] = 'https://untrusted.example/photo.jpg'
    assert select_photo(data, 'HB-JCA') is None
    info['thumburl'] = 'https://upload.wikimedia.org/photo.jpg'
    info['extmetadata']['License']['value'] = 'all-rights-reserved'
    assert select_photo(data, 'HB-JCA') is None


def test_photo_route_validation_and_lookup():
    with patch('photos.cached_json', new=AsyncMock(return_value=sample())) as upstream:
        response = TestClient(app).get('/api/aircraft/photo?registration=hb-jca')
        assert response.status_code == 200
        assert response.json()['registration'] == 'HB-JCA'
        assert response.json()['photo']['author'] == 'A Photographer'
        assert 'intitle%3AHB-JCA' in upstream.call_args.args[0]
    assert TestClient(app).get('/api/aircraft/photo?registration=../../').status_code == 422


def test_provider_failure_is_not_a_missing_photo():
    with patch('photos.cached_json', new=AsyncMock(side_effect=HTTPException(504, 'timeout'))):
        with pytest.raises(HTTPException) as error:
            asyncio.run(aircraft_photo('HB-JCA'))
    assert error.value.status_code == 504


@pytest.mark.parametrize('title', ['File:HB-JCA Zurich skyline.jpg', 'File:Airbus HB-JCA cabin.jpg', 'File:Airbus HB-JCA view from window.jpg', 'File:HB-JCA Boeing cockpit.jpg'])
def test_reject_scenery_and_aircraft_interiors(title):
    assert select_photo(sample(title), 'HB-JCA') is None


def test_reject_interior_metadata_even_with_exterior_sounding_title():
    data = sample()
    data['query']['pages']['1']['imageinfo'][0]['extmetadata']['Categories'] = {'value': 'Aircraft interiors'}
    data['query']['pages']['1']['imageinfo'][0]['extmetadata']['ImageDescription'] = {'value': 'Passenger cabin'}
    assert select_photo(data, 'HB-JCA') is None
