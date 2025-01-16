# Phone Book Module for MIKOPBX

A comprehensive phone book management module for MIKOPBX that provides caller ID management, contact storage, and integration with the PBX system's inbound and outbound calls.

## Features

- Real-time caller ID lookup for inbound and outbound calls
- Contact management with formatted number display
- Excel file import support
- Full-text search capabilities
- Input mask toggling for phone number formatting
- Asterisk AGI integration for call processing
- DataTable-based web interface

## System Requirements

- MIKOPBX version 2024.1.114 or higher
- Modern web browser with JavaScript enabled

## Database Structure

The module uses SQLite database located at:
`/storage/usbdisk1/mikopbx/custom_modules/ModulePhoneBook/db/module.db`

### Phone Book Table (m_PhoneBook)

Main table storing contact information:

```sql
CREATE TABLE m_PhoneBook (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    number INTEGER,          -- Normalized number (1 + last 9 digits)
    number_rep VARCHAR(255), -- Display format (e.g., +7(906)555-43-43)
    call_id VARCHAR(255),    -- Caller ID display name
    search_index TEXT        -- Combined search field for full-text search
);

-- Indexes
CREATE INDEX number ON m_PhoneBook (number);
CREATE INDEX CallerID ON m_PhoneBook (call_id);
```

### Settings Table (m_ModulePhoneBook)

Module configuration storage:

```sql
CREATE TABLE m_ModulePhoneBook (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    disableInputMask INTEGER DEFAULT 0  -- Toggle for input mask functionality
);
```

## Phone Number Format

The module uses a specific format for storing phone numbers:
1. Original number gets cleaned from any non-digit characters
2. Only the last 9 digits are kept
3. Digit "1" is added at the beginning
4. The result is stored in the 'number' field

Example:
```
Original: +7 (906) 555-43-43
Cleaned: 79065554343
Last 9: 065554343
Stored: 1065554343
```

This format ensures:
- Consistent number storage
- Quick lookups
- Independence from country codes
- Compatibility with various number formats

## Core Components

### Business Logic (Lib/)

1. **PhoneBookConf.php** - Core configuration and PBX integration:
   - Manages Asterisk dialplan integration
   - Processes incoming/outgoing call routing

2. **PhoneBookAgi.php** - Asterisk AGI integration:
   - Real-time caller ID lookup
   - Handles both incoming and outgoing calls
   - Sets caller ID display names

3. **PhoneBookImport.php** - Data import functionality:
   - Excel file processing
   - Data validation and normalization
   - Bulk contact import

### Frontend Features

The module includes several JavaScript components:

1. **DataTable Integration:**
   - Server-side processing
   - Real-time search
   - Automatic page length calculation
   - Saved state persistence

2. **Input Masking:**
   - Dynamic phone number formatting
   - Multiple format support
   - Configurable masks
   - Toggle functionality

3. **Excel Import:**
   - File upload with progress tracking
   - Background processing
   - Error handling
   - Automatic data normalization

## Usage

### Managing Contacts

```php
// Example: Adding a new contact
$contact = new PhoneBook();
$contact->number = '1065554343';        // Normalized format
$contact->number_rep = '+7(906)555-43-43'; // Display format
$contact->call_id = 'John Doe';
$contact->search_index = 'johndoe1065554343+7(906)555-43-43';
$contact->save();
```

### Excel Import Format

The module accepts Excel files with the following structure:
```
| Name/Company     | Phone Number      |
|-----------------|-------------------|
| John Doe        | +1 (555) 123-4567 |
| ACME Corp       | +1-777-888-9999   |
```

Phone numbers are automatically normalized during import.

## Development

### Class Structure

```
ModulePhoneBook/
├── Lib/
│   ├── PhoneBookConf.php     # PBX integration
│   ├── PhoneBookAgi.php      # Asterisk AGI handler
│   └── PhoneBookImport.php   # Import processor
├── Models/
│   ├── PhoneBook.php         # Contact storage
│   └── Settings.php          # Configuration
├── public/
    └── assets/
        └── js/
            └── src/
                ├── module-phonebook-datatable.js
                ├── module-phonebook-import.js
                └── module-phonebook-index.js
```

## License

GNU General Public License v3.0 - see LICENSE file for details.

## Support

- Documentation: [https://docs.mikopbx.com/mikopbx/modules/miko/phone-book](https://docs.mikopbx.com/mikopbx/modules/miko/phone-book)
- Email: help@miko.ru
- Issues: GitHub issue tracker