# Phone Book Module for MikoPBX

[![GitHub release](https://img.shields.io/github/v/release/mikopbx/ModulePhoneBook)](https://github.com/mikopbx/ModulePhoneBook/releases)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**[Русская версия](README.ru.md)** | **English**

Contact management module for MikoPBX with real-time caller ID lookup on incoming and outgoing calls.

## Features

- **Caller ID Lookup** — automatic name display for incoming and outgoing calls
- **External API Integration** — lookup caller ID from external services with caching
- **Excel Import** — bulk contact import from Excel files (.xlsx, .xls)
- **Web Interface** — contact management via DataTable with search and pagination
- **Input Masking** — automatic phone number formatting (optional)
- **Multi-language** — 26 languages supported

## Requirements

- MikoPBX 2024.1.114 or higher

## Installation

1. Go to **Modules** → **Marketplace** in MikoPBX admin panel
2. Find **Phone Book** module
3. Click **Install**

Or install from GitHub release:
1. Download the latest `.zip` release
2. Go to **Modules** → **Module Installation**
3. Upload the archive

## Usage

### Adding Contacts

1. Navigate to **Phone Book** module
2. Click **Add** button
3. Enter name and phone number
4. Press Enter or click outside the field to save

### Excel Import

Prepare an Excel file with two columns:

| Name | Phone Number |
|------|--------------|
| John Doe | +1 555 123-4567 |
| ACME Corp | 18005551234 |

1. Go to **Import** tab
2. Select Excel file
3. Click **Import**

Phone numbers are normalized automatically — any format is accepted.

### External API Lookup

Configure external API for caller ID lookup:

1. Go to **Settings** tab
2. Enter API URL with `%number%` placeholder:
   ```
   https://api.example.com/lookup?phone=%number%
   ```
3. Set cache lifetime (seconds, 0 = no cache)
4. Click **Save**

The API should return plain text with the caller name.

#### Example API Request/Response

When a call comes from **+1 (555) 123-4567**, the module normalizes it to **1555123456** and makes an HTTP GET request:

**Request:**
```http
GET https://api.example.com/lookup?phone=1555123456
```

**Response (plain text):**
```
John Doe
```

The name "John Doe" will be displayed as the caller ID on the phone. If the API returns an empty response or error, the module continues without displaying a name.

**Example with company name:**
```http
GET https://api.example.com/lookup?phone=1800555123
```

**Response:**
```
ACME Corporation
```

The cache stores the response for the configured lifetime to reduce API calls for repeated numbers.

## How It Works

### Phone Number Normalization

Numbers are normalized for consistent storage and fast lookups:

```
Input:  +7 (906) 555-43-43
Step 1: 79065554343      (digits only)
Step 2: 065554343        (last 9 digits)
Step 3: 1065554343       (prefix "1" added)
```

This ensures matching works regardless of how numbers are dialed.

### Call Flow

**Incoming calls:**
```
Asterisk → AGI script → PhoneBook lookup → Set CALLERID(name)
```

**Outgoing calls:**
```
Asterisk → CONNECTED_LINE_SEND_SUB → PhoneBook lookup → Set CONNECTEDLINE(name)
```

## Architecture

```
ModulePhoneBook/
├── agi-bin/
│   └── agi_phone_book.php      # Asterisk AGI entry point
├── App/
│   ├── Controllers/            # Phalcon MVC controllers
│   ├── Forms/                  # Form definitions
│   └── Views/                  # Volt templates
├── Lib/
│   ├── PhoneBookConf.php       # Asterisk dialplan integration
│   ├── PhoneBookAgi.php        # AGI caller ID handler
│   ├── PhoneBookFind.php       # External API lookup
│   └── PhoneBookImport.php     # Excel import processor
├── Models/
│   ├── PhoneBook.php           # Contact model
│   └── Settings.php            # Settings model
├── public/assets/
│   ├── css/                    # Module styles
│   └── js/                     # JavaScript (ES6 source + compiled)
└── Messages/                   # Translations (26 languages)
```

## Database

SQLite database at `/storage/usbdisk1/mikopbx/custom_modules/ModulePhoneBook/db/module.db`

**m_PhoneBook** — contacts:
- `id` — primary key
- `number` — normalized number for lookup
- `number_rep` — display format
- `call_id` — contact name
- `search_index` — full-text search field
- `created` — timestamp (for API cache expiration)

**m_ModulePhoneBook** — settings:
- `disableInputMask` — toggle input masking
- `phoneBookApiUrl` — external API URL
- `phoneBookLifeTime` — cache lifetime in seconds

## Development

### Build JavaScript

```bash
# Compile ES6 to ES5 with Babel
babel public/assets/js/src/module-phonebook-datatable.js \
  --out-dir public/assets/js \
  --source-maps inline \
  --presets airbnb
```

### PHP Syntax Check

```bash
php -l Lib/PhoneBookConf.php
```

## Links

- [Documentation (EN)](https://docs.mikopbx.com/mikopbx/english/modules/miko/module-phone-book)
- [Documentation (RU)](https://docs.mikopbx.com/mikopbx/modules/miko/phone-book)
- [MikoPBX Website](https://mikopbx.com)

## Support

- Email: help@miko.ru
- Issues: [GitHub Issues](https://github.com/mikopbx/ModulePhoneBook/issues)

## License

GPL-3.0 — see [LICENSE](LICENSE) file.
