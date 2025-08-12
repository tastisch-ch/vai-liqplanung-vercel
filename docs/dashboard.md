### Dashboard (Management-Übersicht)

Dieses Dashboard fokussiert auf Liquidität, Risiken und zeitnahe Entscheidungen. Alle Werte in CHF, Sprache Deutsch. Simulationen können global ein-/ausgeschaltet werden.

#### KPI-Leiste
- Kontostand: aktueller globaler Kontostand (`getCurrentBalance()`).
- Netto-Cashflow (30 Tage): Summe der signierten Beträge (Einnahmen positiv, Ausgaben negativ) im Intervall [heute, +30T]. Quelle: `getAllTransactionsForPlanning()`.
- Runway: Monate bis 0 basierend auf 3-Monats-Burn (Durchschnitt der negativen Net-Cashflows der letzten 3 Monate). Formel: `runway = kontostand / burn`. Wenn `burn == 0` ⇒ `∞`.
- EOM-Prognose: projizierter Kontostand am Monatsende. Formel: `kontostand + Summe(signierter Betrag bis EOM)`.
- Offene Rechnungen (Eingehend/Ausgehend): Anzahl und Summe der `is_invoice = true` je Richtung.

#### Charts
- Kontostand-Prognose (90 Tage): Liniendiagramm über die Zeit. Daten: `enhanceTransactionsSync()` über geplante Transaktionen (Fixkosten, Löhne, Simulationen) ab aktuellem Kontostand.
- Monatlicher Cashflow (12 Monate): Säulendiagramm mit Netto je Monat (positiv/negativ).
- Kostenstruktur (letzter Monat): Donut/Pie der Ausgaben nach Kategorie (Fixkosten 📌, Löhne 💰, Standard, Simulationen 🔮).

#### Tabellen/Karten
- Fällige Zahlungen (14 Tage): Nächste Ausgaben, nach Datum sortiert.
- Überfällige Rechnungen: `is_invoice = true` und Datum < heute.
- Größte anstehende Ausgaben (30 Tage): Top 5 Ausgaben in den nächsten 30 Tagen.
- Simulationseffekte (bis Monatsende): Summe der Simulationen bis EOM und Liste der Top-Items.

#### Interaktionen
- Global: Zeitraum-Auswahl (1/3/6/12 Monate) und Toggle „Simulationen einbeziehen“.
- Karten/Tabellen können in zukünftigen Iterationen auf die Planung navigieren und den Zeitraum/Kategorie filtern.

#### Datenquellen
- `getCurrentBalance()` (globaler Kontostand)
- `getAllTransactionsForPlanning(userId, start, end, { includeFixkosten, includeSimulationen, includeLohnkosten })`
- `enhanceTransactionsSync(transactions, currentBalance)`

#### Hinweise
- Signierter Betrag: Incoming = +amount, Outgoing = -amount.
- Berechnungen sind deterministisch und binden Simulationen abhängig vom Toggle ein.
- Performance: Aggregationen werden clientseitig berechnet; bei Bedarf später auf serverseitige Aggregation umstellen.


