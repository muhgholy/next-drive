# 1.0.0 (2025-12-28)


### Features

* remove preview and file details components, export driveFileSchemaZod ([9aa7f11](https://github.com/muhgholy/next-drive/commit/9aa7f11052d6f031c69563f76d9ac5cec1140cce))


### BREAKING CHANGES

* Removed DriveFilePreview and DriveFileDetails components. Applications using these components will need to implement their own preview/details UI.

- Remove preview functionality and react-pdf dependency
- Remove file details sheet component
- Export driveFileSchemaZod for form validation
- Update README with Pages Router API example and Zod validation usage
