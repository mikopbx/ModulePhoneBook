# Модуль телефонной книги для MikoPBX

[![GitHub release](https://img.shields.io/github/v/release/mikopbx/ModulePhoneBook)](https://github.com/mikopbx/ModulePhoneBook/releases)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Модуль управления контактами для MikoPBX с автоматическим определением имени звонящего на входящих и исходящих вызовах.

## Возможности

- **Определение имени звонящего** — автоматический показ имени при входящих и исходящих звонках
- **Интеграция с внешним API** — поиск имени через внешние сервисы с кэшированием
- **Импорт из Excel** — массовая загрузка контактов из файлов Excel (.xlsx, .xls)
- **Веб-интерфейс** — управление контактами через DataTable с поиском и пагинацией
- **Маска ввода** — автоматическое форматирование номеров телефонов (опционально)
- **Мультиязычность** — поддержка 26 языков

## Требования

- MikoPBX версии 2024.1.114 или выше

## Установка

1. Перейдите в **Модули** → **Маркетплейс** в панели администрирования MikoPBX
2. Найдите модуль **Телефонная книга**
3. Нажмите **Установить**

Или установите из GitHub релиза:
1. Скачайте последний `.zip` релиз
2. Перейдите в **Модули** → **Установка модуля**
3. Загрузите архив

## Использование

### Добавление контактов

1. Откройте модуль **Телефонная книга**
2. Нажмите кнопку **Добавить**
3. Введите имя и номер телефона
4. Нажмите Enter или кликните вне поля для сохранения

### Импорт из Excel

Подготовьте Excel файл с двумя колонками:

| Имя | Номер телефона |
|-----|----------------|
| Иван Петров | +7 906 555-43-43 |
| ООО Компания | 84951234567 |

1. Перейдите на вкладку **Импорт**
2. Выберите Excel файл
3. Нажмите **Импортировать**

Номера телефонов нормализуются автоматически — принимается любой формат.

### Поиск через внешний API

Настройте внешний API для определения имени звонящего:

1. Перейдите на вкладку **Настройки**
2. Введите URL API с плейсхолдером `%number%`:
   ```
   https://api.example.com/lookup?phone=%number%
   ```
3. Установите время жизни кэша (в секундах, 0 = без кэша)
4. Нажмите **Сохранить**

API должен возвращать текст с именем контакта.

## Как это работает

### Нормализация номеров

Номера нормализуются для единообразного хранения и быстрого поиска:

```
Ввод:   +7 (906) 555-43-43
Шаг 1:  79065554343      (только цифры)
Шаг 2:  065554343        (последние 9 цифр)
Шаг 3:  1065554343       (добавлен префикс "1")
```

Это обеспечивает корректное сопоставление независимо от формата набора номера.

### Поток вызовов

**Входящие звонки:**
```
Asterisk → AGI скрипт → Поиск в PhoneBook → Установка CALLERID(name)
```

**Исходящие звонки:**
```
Asterisk → CONNECTED_LINE_SEND_SUB → Поиск в PhoneBook → Установка CONNECTEDLINE(name)
```

## Архитектура

```
ModulePhoneBook/
├── agi-bin/
│   └── agi_phone_book.php      # Точка входа AGI для Asterisk
├── App/
│   ├── Controllers/            # Контроллеры Phalcon MVC
│   ├── Forms/                  # Определения форм
│   └── Views/                  # Шаблоны Volt
├── Lib/
│   ├── PhoneBookConf.php       # Интеграция с диалпланом Asterisk
│   ├── PhoneBookAgi.php        # Обработчик AGI для Caller ID
│   ├── PhoneBookFind.php       # Поиск через внешний API
│   └── PhoneBookImport.php     # Обработчик импорта Excel
├── Models/
│   ├── PhoneBook.php           # Модель контакта
│   └── Settings.php            # Модель настроек
├── public/assets/
│   ├── css/                    # Стили модуля
│   └── js/                     # JavaScript (исходники ES6 + скомпилированные)
└── Messages/                   # Переводы (26 языков)
```

## База данных

SQLite база данных: `/storage/usbdisk1/mikopbx/custom_modules/ModulePhoneBook/db/module.db`

**m_PhoneBook** — контакты:
- `id` — первичный ключ
- `number` — нормализованный номер для поиска
- `number_rep` — отображаемый формат
- `call_id` — имя контакта
- `search_index` — поле для полнотекстового поиска
- `created` — временная метка (для истечения кэша API)

**m_ModulePhoneBook** — настройки:
- `disableInputMask` — переключатель маски ввода
- `phoneBookApiUrl` — URL внешнего API
- `phoneBookLifeTime` — время жизни кэша в секундах

## Разработка

### Сборка JavaScript

```bash
# Компиляция ES6 в ES5 с помощью Babel
babel public/assets/js/src/module-phonebook-datatable.js \
  --out-dir public/assets/js \
  --source-maps inline \
  --presets airbnb
```

### Проверка синтаксиса PHP

```bash
php -l Lib/PhoneBookConf.php
```

## Ссылки

- [Документация (RU)](https://docs.mikopbx.com/mikopbx/modules/miko/phone-book)
- [Документация (EN)](https://docs.mikopbx.com/mikopbx/english/modules/miko/module-phone-book)
- [Сайт MikoPBX](https://mikopbx.com)

## Поддержка

- Email: help@miko.ru
- Вопросы: [GitHub Issues](https://github.com/mikopbx/ModulePhoneBook/issues)

## Лицензия

GPL-3.0 — см. файл [LICENSE](LICENSE).
