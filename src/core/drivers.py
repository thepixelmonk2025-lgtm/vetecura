class PrinterDriver:

    @staticmethod
    def render_to_zpl(symbology: str, value: str, layout: dict) -> str:
        # Simplistic conversion: ZPL layout structure
        width = layout.get("canvas", {}).get("width_mm", 40)
        height = layout.get("canvas", {}).get("height_mm", 20)
        
        commands = [
            "^XA",
            f"^LL{int(height * 8)}",  # length in dots
            f"^PW{int(width * 8)}",   # width in dots
        ]
        
        elements = layout.get("elements", [])
        for el in elements:
            x = int(el.get("x_mm", 0) * 8)
            y = int(el.get("y_mm", 0) * 8)
            
            if el.get("type") == "qr":
                # ZPL QR Code command
                commands.append(f"^FO{x},{y}^BQN,2,4^FDQA,{value}^FS")
            elif el.get("type") == "text":
                val = value if el.get("value_field") == "barcode_value" else el.get("value_field")
                commands.append(f"^FO{x},{y}^A0N,20,20^FD{val}^FS")
                
        commands.append("^XZ")
        return "\n".join(commands)

    @staticmethod
    def render_to_escpos(symbology: str, value: str, layout: dict) -> bytes:
        # Simplistic ESC/POS conversion: Returns binary ESC/POS formatting bytes
        # GS v 0 command for raster image generation, or native barcode commands.
        # We will generate a mock byte stream indicating format block.
        header = b"\x1b\x40" # ESC @ (init printer)
        cut = b"\x1d\x56\x00" # GS V 0 (cut)
        body = f"MOCK_ESCPOS_RENDER:{symbology}:{value}".encode("utf-8")
        return header + body + cut
