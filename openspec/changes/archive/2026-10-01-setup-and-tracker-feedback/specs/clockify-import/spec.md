## MODIFIED Requirements

### Requirement: Clockify API key handling
The system SHALL ask for a Clockify API key, SHALL send it only to Clockify's API, and SHALL NOT persist it in any browser storage, URL, log, or error message. The system SHALL tell the user where to create the key in Clockify's current interface: account menu (top right) → Preferences → Advanced tab → Manage API keys → Generate.

#### Scenario: Where to find the key
- **WHEN** the user opens the key step of the import wizard
- **THEN** the hint says to open the account menu in Clockify, choose Preferences, open the Advanced tab and generate a key under Manage API keys, in the current language

#### Scenario: Key entered
- **WHEN** the user pastes an API key and continues
- **THEN** the system validates it by loading the Clockify user and the list of workspaces

#### Scenario: Invalid key
- **WHEN** Clockify rejects the key
- **THEN** the system shows "Clockify API key is not valid" and keeps the wizard open

#### Scenario: Key not persisted
- **WHEN** the wizard is closed or the page is reloaded
- **THEN** the key is no longer available and is not found in local or session storage

#### Scenario: Advice after import
- **WHEN** the import finished successfully
- **THEN** the system recommends deleting the API key in Clockify under Preferences → Advanced → Manage API keys
