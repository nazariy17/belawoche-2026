from providers import operator_code, AIRLINES


def test_airline_prefixes():
    assert operator_code(' EJU123A ', 'OE-ABC') == 'EJU'
    assert AIRLINES['EJU'] == 'easyJet Europe'
    assert operator_code('XYZ123', None) == 'XYZ'


def test_private_aircraft_are_not_airlines():
    for flight, registration in [('HBJCA', 'HB-JCA'), ('N123AB', 'N123AB'), (None, None), ('ABC', None)]:
        assert operator_code(flight, registration) is None
