# [1.1.0](https://github.com/muhgholy/next-drive/compare/v1.0.2...v1.1.0) (2025-12-28)


### Features

* add client-side URL utilities and image quality types ([a793277](https://github.com/muhgholy/next-drive/commit/a7932776c07769c8e77824b79717908ac38644c8))

## [1.0.2](https://github.com/muhgholy/next-drive/compare/v1.0.1...v1.0.2) (2025-12-28)


### Bug Fixes

* move driveFileSchemaZod to client package to avoid bundling server modules ([33b4f75](https://github.com/muhgholy/next-drive/commit/33b4f75f762ea8b160f1d607fb5cc0d8ea0ee75f))

## [1.0.1](https://github.com/muhgholy/next-drive/compare/v1.0.0...v1.0.1) (2025-12-28)


### Bug Fixes

* remove NPM_TOKEN for trusted publisher authentication ([ce20a91](https://github.com/muhgholy/next-drive/commit/ce20a919ccfde43c9f3f034bbdb1258dc289d3b6))

# 1.0.0 (2025-12-28)


### Features

* remove preview and file details components, export driveFileSchemaZod ([9aa7f11](https://github.com/muhgholy/next-drive/commit/9aa7f11052d6f031c69563f76d9ac5cec1140cce))


### BREAKING CHANGES

* Removed DriveFilePreview and DriveFileDetails components. Applications using these components will need to implement their own preview/details UI.

- Remove preview functionality and react-pdf dependency
- Remove file details sheet component
- Export driveFileSchemaZod for form validation
- Update README with Pages Router API example and Zod validation usage
