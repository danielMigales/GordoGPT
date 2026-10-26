import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "update_results.py"
spec = importlib.util.spec_from_file_location("update_results", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class OfficialResultParserTests(unittest.TestCase):
    def test_parse_official_result_page(self):
        html = """
        <html><body>
        <p>En el sorteo de El Gordo de la Primitiva del 18 de octubre de 2026,
        la combinación ganadora ha correspondido a los siguientes números:</p>
        <p>11 - 14 - 29 - 31 - 34 Número clave (reintegro): R(8)</p>
        </body></html>
        """
        self.assertEqual(module.parse_draw(html), {
            "date": "2026-10-18",
            "numbers": [11, 14, 29, 31, 34],
            "clave": 8,
        })

    def test_parse_official_result_page_25_october(self):
        html = """
        <html><body>
        <p>En el sorteo de El Gordo de la Primitiva del 25 de octubre de 2026,
        la combinación ganadora ha correspondido a los siguientes números:</p>
        <p>09 - 26 - 41 - 43 - 46 Número clave (reintegro): R(7)</p>
        </body></html>
        """
        self.assertEqual(module.parse_draw(html), {
            "date": "2026-10-25",
            "numbers": [9, 26, 41, 43, 46],
            "clave": 7,
        })

    def test_listing_only_keeps_result_detail_links(self):
        html = """
        <a href="/es/gordo-primitiva/resultados/el-gordo-de-la-primitiva-resultados-del-18-de-octubre-de-2026">18/10</a>
        <a href="/es/gordo-primitiva/estadisticas">estadísticas</a>
        """
        self.assertEqual(len(module.listing_urls(html)), 1)

    def test_rejects_unparseable_official_page(self):
        with self.assertRaises(ValueError):
            module.parse_draw("<html><body>Resultado no disponible</body></html>")


if __name__ == "__main__":
    unittest.main()
