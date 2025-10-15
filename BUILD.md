# Building Standalone Executables

This guide explains how to build standalone executables for Windows, macOS, and Linux.

## Overview

Roman's Rater uses PyInstaller to create single-file executables that include:
- Python runtime
- All dependencies
- Application code
- Required data files

No Python installation needed on target systems!

## Prerequisites

### All Platforms
- Python 3.11 or higher
- Git (to clone repository)
- 500 MB free disk space

### Platform-Specific

**Windows:**
- Windows 10 or later
- Visual C++ Redistributable (usually pre-installed)

**macOS:**
- macOS 10.15 (Catalina) or later
- Xcode Command Line Tools: `xcode-select --install`

**Linux:**
- Any modern distribution (Ubuntu 20.04+, Fedora 35+, etc.)
- Build tools: `sudo apt install python3-dev build-essential` (Debian/Ubuntu)

## Building

### Windows

1. **Open Command Prompt** (cmd.exe)

2. **Navigate to project directory:**
   ```cmd
   cd C:\path\to\romans-rater
   ```

3. **Run build script:**
   ```cmd
   build-windows.bat
   ```

4. **Find executable:**
   ```
   dist\romans-rater.exe
   ```

### macOS

1. **Open Terminal**

2. **Navigate to project directory:**
   ```bash
   cd /path/to/romans-rater
   ```

3. **Run build script:**
   ```bash
   ./build-macos.sh
   ```

4. **Find executable:**
   ```
   dist/romans-rater
   ```

### Linux

1. **Open Terminal**

2. **Navigate to project directory:**
   ```bash
   cd /path/to/romans-rater
   ```

3. **Run build script:**
   ```bash
   ./build-linux.sh
   ```

4. **Find executable:**
   ```
   dist/romans-rater
   ```

## Testing the Executable

### GUI Mode
```bash
# Windows
dist\romans-rater.exe

# macOS/Linux
./dist/romans-rater
```

### CLI Mode
```bash
# Windows
dist\romans-rater.exe "C:\path\to\quote.pdf"

# macOS/Linux
./dist/romans-rater /path/to/quote.pdf
```

### With OCR
```bash
# Windows
dist\romans-rater.exe quote.pdf --ocr

# macOS/Linux
./dist/romans-rater quote.pdf --ocr
```

## Distribution

### Windows

**Single executable:**
```
romans-rater.exe  (~80 MB)
```

Package with data files if needed:
```
romans-rater-windows-v4.21.0.zip
├── romans-rater.exe
├── README.md
└── rating-tables/  (if using external tables)
```

### macOS

**Create .app bundle (optional):**
```bash
mkdir -p Romans\ Rater.app/Contents/MacOS
mv dist/romans-rater Romans\ Rater.app/Contents/MacOS/
```

**Create DMG (optional):**
```bash
hdiutil create -volname "Roman's Rater" -srcfolder dist -ov -format UDZO romans-rater-macos-v4.21.0.dmg
```

### Linux

**Create tarball:**
```bash
cd dist
tar -czf romans-rater-linux-x64-v4.21.0.tar.gz romans-rater
```

**Create .deb package (Ubuntu/Debian):**
```bash
# Create package structure
mkdir -p romans-rater_4.21.0/usr/local/bin
cp dist/romans-rater romans-rater_4.21.0/usr/local/bin/

mkdir -p romans-rater_4.21.0/DEBIAN
cat > romans-rater_4.21.0/DEBIAN/control << EOF
Package: romans-rater
Version: 4.21.0
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Your Name <daniel.medina@coverwhale.com>
Description: Auto liability insurance rating engine
 Desktop application for calculating commercial auto liability premiums.
EOF

# Build package
dpkg-deb --build romans-rater_4.21.0
```

## File Sizes

Approximate executable sizes:
- **Windows**: ~80 MB (romans-rater.exe)
- **macOS**: ~75 MB (romans-rater)
- **Linux**: ~70 MB (romans-rater)

Sizes include:
- Python runtime
- NiceGUI and dependencies
- PDF parsing libraries
- All application code

## Troubleshooting

### Build Fails

**"PyInstaller not found"**
```bash
pip install pyinstaller>=6.0.0
```

**"Module not found" errors**
```bash
pip install -r requirements.txt
```

**Disk space issues**
- Ensure 500 MB free space
- Clean previous builds: `pyinstaller --clean romans-rater.spec`

### Runtime Errors

**"Cannot find module"**
- Check hidden imports in `romans-rater.spec`
- Rebuild with `--clean` flag

**GUI doesn't start**
- Check console output for errors
- Ensure display/X11 available (Linux)

**PDF parsing fails**
- For OCR: Install Tesseract separately
  - Windows: https://github.com/UB-Mannheim/tesseract/wiki
  - macOS: `brew install tesseract`
  - Linux: `sudo apt install tesseract-ocr`

### Platform-Specific

**Windows: "DLL not found"**
- Install Visual C++ Redistributable
- https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist

**macOS: "App is damaged"**
- Remove quarantine: `xattr -cr Romans\ Rater.app`
- Or: System Preferences → Security & Privacy → Allow

**Linux: "Permission denied"**
```bash
chmod +x dist/romans-rater
```

## Advanced Configuration

### Custom Icon

1. **Create icons:**
   - Windows: `icon.ico` (256x256)
   - macOS: `icon.icns`
   - Linux: `icon.png` (256x256)

2. **Update spec file:**
   ```python
   exe = EXE(
       ...
       icon='path/to/icon.ico',  # Windows
       # or
       icon='path/to/icon.icns',  # macOS
   )
   ```

3. **Rebuild:**
   ```bash
   pyinstaller romans-rater.spec --clean
   ```

### Optimize Size

**Enable UPX compression:**
```python
# In romans-rater.spec
exe = EXE(
    ...
    upx=True,
    upx_exclude=[],
)
```

Install UPX:
- Windows: https://github.com/upx/upx/releases
- macOS: `brew install upx`
- Linux: `sudo apt install upx-ucl`

**Exclude unused modules:**
```python
# In romans-rater.spec
a = Analysis(
    ...
    excludes=[
        'pytest',
        'pytest-cov',
        'tkinter',
        'matplotlib',
    ],
)
```

## GitHub Actions (CI/CD)

Create `.github/workflows/build.yml`:

```yaml
name: Build Executables

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pyinstaller romans-rater.spec
      - uses: actions/upload-artifact@v3
        with:
          name: romans-rater-windows
          path: dist/romans-rater.exe

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pyinstaller romans-rater.spec
      - uses: actions/upload-artifact@v3
        with:
          name: romans-rater-macos
          path: dist/romans-rater

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pyinstaller romans-rater.spec
      - uses: actions/upload-artifact@v3
        with:
          name: romans-rater-linux
          path: dist/romans-rater
```

## Release Process

1. **Build for all platforms**
2. **Test each executable**
3. **Create release assets:**
   - `romans-rater-windows-v4.21.0.zip`
   - `romans-rater-macos-v4.21.0.tar.gz`
   - `romans-rater-linux-v4.21.0.tar.gz`

4. **Create GitHub release:**
   ```bash
   gh release create v4.21.0 \
     romans-rater-windows-v4.21.0.zip \
     romans-rater-macos-v4.21.0.tar.gz \
     romans-rater-linux-v4.21.0.tar.gz \
     --title "Roman's Rater v4.21.0" \
     --notes "Release notes here"
   ```

## Support

- **Issues**: https://github.com/dmedina5/romans-rater/issues
- **PyInstaller Docs**: https://pyinstaller.org/en/stable/
- **Build Help**: Check `build-*.log` files

---

**Building on the correct platform ensures compatibility!**
- Build on Windows → for Windows
- Build on macOS → for macOS
- Build on Linux → for Linux
