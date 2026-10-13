"""Turns the app's metainfo file into an AppStream catalog entry for the COSMIC Store.

Usage: python3 make-catalog.py <metainfo.xml> <package name>   (writes XML to stdout)
"""

import sys
import xml.etree.ElementTree as ET


def main(metainfo_path, package_name):
    component = ET.parse(metainfo_path).getroot()
    app_id = component.findtext("id")

    pkgname = ET.Element("pkgname")
    pkgname.text = package_name
    component.insert(1, pkgname)

    icon = ET.SubElement(component, "icon", {"type": "stock"})
    icon.text = app_id  # installed in the hicolor theme by the package

    catalog = ET.Element("components", {"version": "0.16", "origin": package_name})
    catalog.append(component)
    ET.indent(catalog)
    sys.stdout.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    sys.stdout.write(ET.tostring(catalog, encoding="unicode"))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
