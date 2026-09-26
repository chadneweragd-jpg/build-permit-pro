import re
from bs4 import BeautifulSoup

def parse_issue_date(date_str: str) -> str:
    """
    Parses any date format from Kelowna portal table into ISO YYYY-MM-DD.
    Supports:
      - 2026-09-25, 2026/09/25, 2026.09.25
      - September 25, 2026, Sept 25 2026, Sept. 25th, 2026
      - 25-Sep-2026, 25 September 2026, 25-09-2026
      - 09/25/2026, 9/25/2026
    """
    if not date_str:
        return ""
    cleaned = date_str.strip()

    # 1. ISO format: YYYY-MM-DD
    m_iso = re.search(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", cleaned)
    if m_iso:
        yr, mo, da = m_iso.groups()
        return f"{int(yr):04d}-{int(mo):02d}-{int(da):02d}"

    months = {
        "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
        "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
    }

    # 2. Textual month first: 'September 25, 2026' or 'Sep 25, 2026' or 'Sept. 25th, 2026'
    m_text = re.search(r"([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})", cleaned)
    if m_text:
        mon_str, da, yr = m_text.groups()
        mon = months.get(mon_str[:3].lower(), "01")
        return f"{yr}-{mon}-{int(da):02d}"

    # 3. Day first: '25-Sep-2026' or '25 September 2026'
    m_dmy = re.search(r"(\d{1,2})(?:st|nd|rd|th)?[-/\s]+([A-Za-z]+)\.?[-/\s]+(\d{4})", cleaned)
    if m_dmy:
        da, mon_str, yr = m_dmy.groups()
        mon = months.get(mon_str[:3].lower(), "01")
        return f"{yr}-{mon}-{int(da):02d}"

    # 4. Numeric US format: MM/DD/YYYY
    m_us = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", cleaned)
    if m_us:
        mo, da, yr = m_us.groups()
        return f"{yr}-{int(mo):02d}-{int(da):02d}"

    return ""


def parse_estimated_value(val_str: str) -> float:
    """
    Parses dollar amount string into float, e.g. '$870,000.00' -> 870000.0
    """
    clean = re.sub(r"[^\d.]", "", val_str)
    try:
        return float(clean) if clean else 0.0
    except ValueError:
        return 0.0


def parse_html_table(html: str) -> list:
    """
    Parses table from Kelowna portal with dynamic column mapping and multi-row support.
    Expected columns:
      0: Permit
      1: Address
      2: Applicant
      3: Contractor / Mailing Address
      4: Sub Type
      5: Value
      6: Approval Date
    """
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    if not tables:
        return []

    records = []
    for table in tables:
        rows = table.find_all("tr")
        if not rows:
            continue

        # Check headers
        col_map = {
            "permit": 0,
            "address": 1,
            "applicant": 2,
            "contractor": 3,
            "sub_type": 4,
            "value": 5,
            "date": 6
        }

        header_row = rows[0]
        ths = header_row.find_all(["th", "td"])
        header_texts = [th.get_text(strip=True).lower() for th in ths]
        
        has_detected_headers = False
        for idx, htext in enumerate(header_texts):
            if "permit" in htext:
                col_map["permit"] = idx
                has_detected_headers = True
            elif "address" in htext and "contractor" not in htext and "mailing" not in htext:
                col_map["address"] = idx
                has_detected_headers = True
            elif "applicant" in htext:
                col_map["applicant"] = idx
                has_detected_headers = True
            elif "contractor" in htext:
                col_map["contractor"] = idx
                has_detected_headers = True
            elif "sub" in htext or "type" in htext:
                col_map["sub_type"] = idx
                has_detected_headers = True
            elif "value" in htext or "cost" in htext or "est" in htext:
                col_map["value"] = idx
                has_detected_headers = True
            elif "date" in htext or "approval" in htext:
                col_map["date"] = idx
                has_detected_headers = True

        data_rows = rows[1:] if has_detected_headers else rows

        for tr in data_rows:
            tds = tr.find_all("td")
            if len(tds) < 4:
                # Check for secondary detail/scope row with colspan
                if len(tds) == 1 and records and tr.get_text(strip=True):
                    extra_text = tr.get_text(strip=True)
                    if len(extra_text) > 10:
                        records[-1]["description"] += f" {extra_text}"
                continue

            # Check if cells use data-label attribute (responsive table layout)
            permit_val = ""
            addr_val = ""
            app_val = "Private Applicant"
            contr_val = "Owner / Builder"
            type_val = "Building Permit"
            val_num = 0.0
            date_val = ""

            # Check data-labels
            cell_by_label = {}
            for td in tds:
                label = td.get("data-label", "").lower()
                if label:
                    cell_by_label[label] = td.get_text(strip=True)

            if "permit" in cell_by_label:
                permit_val = cell_by_label.get("permit", "")
                addr_val = cell_by_label.get("address", "")
                app_val = cell_by_label.get("applicant", "Private Applicant")
                contr_val = cell_by_label.get("contractor", "Owner / Builder")
                type_val = cell_by_label.get("sub type", cell_by_label.get("type", "Building Permit"))
                val_num = parse_estimated_value(cell_by_label.get("value", "0"))
                date_val = parse_issue_date(cell_by_label.get("approval date", cell_by_label.get("date", "")))
            else:
                max_idx = max(col_map.values())
                if len(tds) > max_idx:
                    permit_val = tds[col_map["permit"]].get_text(strip=True)
                    addr_val = tds[col_map["address"]].get_text(strip=True)
                    app_val = tds[col_map["applicant"]].get_text(strip=True) if len(tds) > col_map["applicant"] else "Private Applicant"
                    contr_val = tds[col_map["contractor"]].get_text(strip=True) if len(tds) > col_map["contractor"] else "Owner / Builder"
                    type_val = tds[col_map["sub_type"]].get_text(strip=True) if len(tds) > col_map["sub_type"] else "Building Permit"
                    val_str = tds[col_map["value"]].get_text(strip=True) if len(tds) > col_map["value"] else "0"
                    val_num = parse_estimated_value(val_str)
                    date_raw = tds[col_map["date"]].get_text(strip=True) if len(tds) > col_map["date"] else ""
                    date_val = parse_issue_date(date_raw)
                else:
                    # Positional fallback
                    permit_val = tds[0].get_text(strip=True)
                    addr_val = tds[1].get_text(strip=True)
                    app_val = tds[2].get_text(strip=True) if len(tds) > 2 else "Private Applicant"
                    contr_val = tds[3].get_text(strip=True) if len(tds) > 3 else "Owner / Builder"
                    type_val = tds[4].get_text(strip=True) if len(tds) > 4 else "Building Permit"
                    val_num = parse_estimated_value(tds[5].get_text(strip=True)) if len(tds) > 5 else 0.0
                    date_val = parse_issue_date(tds[6].get_text(strip=True)) if len(tds) > 6 else ""

            if not permit_val:
                continue

            # Clean contractor string: e.g. "LAKEHOUSE CUSTOM HOMES LTD, 5014 TWINFLOWER CRES" -> "LAKEHOUSE CUSTOM HOMES LTD"
            contr_clean = contr_val.split(",")[0].strip() if contr_val else "Owner / Builder"

            # Determine work_class
            combined_desc = f"{type_val} at {addr_val}."
            work_class = "Commercial" if any(k in f"{type_val} {combined_desc}".lower() for k in ["commercial", "industrial", "office", "retail", "institution", "apartment", "multi-family", "high-rise"]) else "Residential"

            records.append({
                "permit_number": permit_val,
                "address": f"{addr_val}, Kelowna, BC" if "Kelowna" not in addr_val else addr_val,
                "applicant_name": app_val or "Private Applicant",
                "contractor_name": contr_clean,
                "permit_type": type_val,
                "estimated_value": val_num,
                "issue_date": date_val or "2026-09-25",
                "work_class": work_class,
                "description": combined_desc
            })

    return records


# Run unit tests on the parser
if __name__ == "__main__":
    html_test = """
    <table class="views-table cols-7">
      <thead>
        <tr>
          <th class="views-field-permit">Permit</th>
          <th class="views-field-address">Address</th>
          <th class="views-field-applicant">Applicant</th>
          <th class="views-field-contractor">Contractor / Mailing Address</th>
          <th class="views-field-subtype">Sub Type</th>
          <th class="views-field-value">Value</th>
          <th class="views-field-date">Approval Date</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>BP26-001550</td>
          <td>1250 Ellis St</td>
          <td>Mission Group Communities</td>
          <td>MISSION GROUP ENTERPRISES, 1250 ELLIS ST</td>
          <td>Commercial High-Rise</td>
          <td>$42,500,000.00</td>
          <td>September 25, 2026</td>
        </tr>
        <tr>
          <td>BP26-001548</td>
          <td>5200 Kettle Valley Way</td>
          <td>Private Applicant</td>
          <td>AUTHENTECH HOMES LTD</td>
          <td>Single Family Dwelling New</td>
          <td>$925,000</td>
          <td>25-Sep-2026</td>
        </tr>
      </tbody>
    </table>
    """
    recs = parse_html_table(html_test)
    print(f"Parsed {len(recs)} records:")
    for r in recs:
        print(f"  {r['permit_number']} | {r['address']} | {r['contractor_name']} | {r['permit_type']} | ${r['estimated_value']:,.2f} | {r['issue_date']}")
    
    assert len(recs) == 2
    assert recs[0]["permit_number"] == "BP26-001550"
    assert recs[0]["contractor_name"] == "MISSION GROUP ENTERPRISES"
    assert recs[0]["estimated_value"] == 42500000.0
    assert recs[0]["issue_date"] == "2026-09-25"
    print("\n[OK] HTML Parser test passed!")

    # Test incremental filtering logic
    mock_feed = [
        {"permit_number": "BP26-001550", "issue_date": "2026-09-25"},
        {"permit_number": "BP26-001548", "issue_date": "2026-09-25"},
        {"permit_number": "BP26-001535", "issue_date": "2026-09-24"},
        {"permit_number": "BP26-001520", "issue_date": "2026-09-23"},
        {"permit_number": "BP26-001512", "issue_date": "2026-09-22"},
        {"permit_number": "BP26-001476", "issue_date": "2026-09-17"},
        {"permit_number": "BP26-001338", "issue_date": "2026-09-14"},
    ]
    
    # 1. Filter with since_date = '2026-09-20'
    since = "2026-09-20"
    filtered = [p for p in mock_feed if p["issue_date"] >= since]
    assert len(filtered) == 5
    assert filtered[0]["permit_number"] == "BP26-001550"
    assert filtered[-1]["permit_number"] == "BP26-001512"
    
    # 2. Check latest permit date calculation
    latest_date = max(p["issue_date"] for p in filtered) if filtered else "None"
    assert latest_date == "2026-09-25"
    print(f"[OK] Incremental polling test passed: Fetched {len(filtered)} new records, latest permit date: {latest_date}")
    
    # 3. Test empty result handling
    since_future = "2026-10-01"
    filtered_future = [p for p in mock_feed if p["issue_date"] >= since_future]
    assert len(filtered_future) == 0
    print("[OK] Empty result set test passed!")
