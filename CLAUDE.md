# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ModulePhoneBook is a MikoPBX extension module that provides caller ID management and contact storage. It integrates with Asterisk PBX for real-time caller identification on inbound and outbound calls.

## Build Commands

### JavaScript Compilation
```bash
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace ghcr.io/mikopbx/babel-compiler:latest /workspace/Extensions/[module]/public/assets/js/src/[file] extension`
```

### PHP Syntax Check
```bash
php -l Lib/PhoneBookConf.php
```

### Code Quality (PHPStan)
Run phpstan after creating new PHP code to validate quality.

### Dependencies
```bash
composer install
```

## Architecture

### Directory Structure
- `App/Controllers/` - Phalcon MVC controllers (ModulePhoneBookController)
- `App/Forms/` - Phalcon form definitions
- `Lib/` - Core business logic
  - `PhoneBookConf.php` - PBX integration, REST API callbacks, Asterisk dialplan generation
  - `PhoneBookAgi.php` - Asterisk AGI handler for real-time caller ID lookup
  - `PhoneBookImport.php` - Excel import processor using PhpSpreadsheet
  - `MikoPBXVersion.php` - Version compatibility helpers
- `Models/` - Phalcon ORM models (PhoneBook, Settings)
- `Setup/` - Module installation logic (PbxExtensionSetup)
- `agi-bin/` - Asterisk AGI scripts
- `Messages/` - i18n translation files (26 languages)
- `public/assets/js/src/` - Source JavaScript files (ES6)
- `public/assets/js/` - Compiled JavaScript files

### Data Flow
1. **Inbound calls**: Asterisk dialplan → `agi_phone_book.php` → `PhoneBookAgi::setCallerId('in')` → Sets CALLERID(name)
2. **Outbound calls**: CONNECTED_LINE_SEND_SUB → `PhoneBookAgi::setCallerId('out')` → Sets CONNECTEDLINE(name)
3. **Web UI**: DataTable with server-side processing via AJAX to `ModulePhoneBookController::getNewRecordsAction()`

### Phone Number Storage Format
Numbers are normalized for consistent storage and fast lookups:
- Strip all non-digit characters
- Keep last 9 digits only
- Prepend "1"
- Example: `+7 (906) 555-43-43` → `1065554343`

### Database
SQLite database at runtime: `/storage/usbdisk1/mikopbx/custom_modules/ModulePhoneBook/db/module.db`

Tables:
- `m_PhoneBook` - contacts (id, number, number_rep, call_id, search_index)
- `m_ModulePhoneBook` - settings (disableInputMask)

### Key Integration Points
- `PhoneBookConf::moduleRestAPICallback()` - REST API entry point for Excel import
- `PhoneBookConf::generateIncomingRoutBeforeDial()` - Injects AGI into inbound routes
- `PhoneBookConf::generateOutRoutContext()` - Injects connected line handling for outbound
- `PhoneBookConf::extensionGenContexts()` - Generates `[phone-book-out]` Asterisk context

### Frontend
- Uses Semantic UI components and DataTables
- Input masking for phone numbers (toggleable via settings)
- State persistence in localStorage for page length and search
- Files in `public/assets/js/src/` must be compiled with Babel to `public/assets/js/`

## Module Configuration

`module.json` defines module metadata including:
- `moduleUniqueID`: "ModulePhoneBook"
- `min_pbx_version`: "2024.1.114"

## CI/CD

GitHub Actions workflow (`.github/workflows/build.yml`) uses shared MikoPBX workflow for building and publishing releases.
